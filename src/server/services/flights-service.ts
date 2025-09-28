type FlightData = {
    icao24: string;
    callsign: string;
    originCountry: string;
    timePosition: number | null;
    lastContact: number;
    longitude: number | null;
    latitude: number | null;
    baroAltitude: number | null;
    onGround: boolean;
    velocity: number | null;
    trueTrack: number | null;
    verticalRate: number | null;
    sensors: number[];
    geoAltitude: number | null;
    squawk: string;
    spi: boolean;
    positionSource: number;
    category: number;
};

export class FlightsService {
    OPENSKY_API_BASE_URL = `https://opensky-network.org/api`;
    OPENSKY_AUTH_BASE_URL = `https://auth.opensky-network.org/auth`;
    flightsCache: Map<string, { ts: number; data: FlightData[] }> = new Map(); // key: url, value: { ts, data }
    FLIGHTS_CACHE_MS: number = 5 * 1000;
    openSkyAuthToken: string = '';
    openSkyAuthTokenFetchTime: number = 0;
    OPENSKY_AUTH_TOKEN_CACHE_MS = 25 * 60 * 1000;

    async getOpenSkyAuthToken(): Promise<string> {
        try {
            const response = await fetch(
                `${this.OPENSKY_AUTH_BASE_URL}/realms/opensky-network/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: process.env.OPENSKY_CLIENT_ID || '',
                        client_secret: process.env.OPENSKY_CLIENT_SECRET || '',
                    }),
                }
            );
            if (!response.ok) {
                console.error(`OpenSky auth failed: ${response.status} - ${response.statusText}`);
                return '';
            }
            const data: any = await response.json();
            const token = data.access_token || '';
            if (!token) {
                console.error('No access token in OpenSky response');
            }
            console.info('OpenSky auth token retrieved');
            return token;
        } catch (error) {
            console.error('Error fetching OpenSky token:', error);
            return '';
        }
    }

    async ensureAuthToken() {
        const now = Date.now();
        if (
            !this.openSkyAuthToken ||
            now - this.openSkyAuthTokenFetchTime > this.OPENSKY_AUTH_TOKEN_CACHE_MS
        ) {
            this.openSkyAuthToken = await this.getOpenSkyAuthToken();
            this.openSkyAuthTokenFetchTime = now;
        }
    }

    async checkCredits() {
        try {
            await this.ensureAuthToken();
            const token = this.openSkyAuthToken;
            const url = new URL('https://opensky-network.org/api/states/all');
            url.searchParams.set('lamin', '0');
            url.searchParams.set('lomin', '0');
            url.searchParams.set('lamax', '1');
            url.searchParams.set('lomax', '1'); // Small area to minimize credit usage
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const remainingCredits = response.headers.get('x-rate-limit-remaining');
            console.info(`OpenSky credits: ${remainingCredits}`);
        } catch (error) {
            console.error(error);
        }
    }

    getBoundaries(lat: number, lng: number, size: number) {
        const kmPerDegLat = 111.32;
        const dLat = size / 2 / kmPerDegLat;
        const dLng = size / 2 / (kmPerDegLat * Math.cos((lat * Math.PI) / 180));
        const wrap = (x: number) => ((x + 540) % 360) - 180;
        return {
            latMin: lat - dLat,
            latMax: lat + dLat,
            lngMin: wrap(lng - dLng),
            lngMax: wrap(lng + dLng),
        };
    }

    getAllStatesParams(lat: number, lng: number, size: number): string {
        const boundaries = this.getBoundaries(lat, lng, size);
        const params = new URLSearchParams();
        params.set('lamin', String(boundaries.latMin.toFixed(1)));
        params.set('lamax', String(boundaries.latMax.toFixed(1)));
        params.set('lomin', String(boundaries.lngMin.toFixed(1)));
        params.set('lomax', String(boundaries.lngMax.toFixed(1)));
        params.set('extended', String(1));
        return params.toString();
    }

    async getFlights(lat: number, lng: number, size: number) {
        console.info('getFlights()', { lat, lng, size });
        await this.ensureAuthToken();
        const params = this.getAllStatesParams(lat, lng, size);
        const url = `${this.OPENSKY_API_BASE_URL}/states/all?${params}`;
        const cached = this.flightsCache.get(url);
        if (cached && Date.now() - cached.ts < this.FLIGHTS_CACHE_MS) {
            console.info(`${cached.data.length} flights retrieved from cache`);
            return cached.data;
        }
        const headers = {
            Accept: 'application/json',
            ...(this.openSkyAuthToken ? { Authorization: `Bearer ${this.openSkyAuthToken}` } : {}),
        };
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            const text = await resp.text();
            console.error(text || `Error ${resp.status}`);
            return [];
        }
        const responseData: any = await resp.json();
        if (!responseData.states) {
            console.error(`Error missing flights data from OpenSky`);
            return [];
        }
        let flights: FlightData[] = responseData.states.map((f: any) => ({
            icao24: f[0],
            callsign: f[1]?.trim(),
            originCountry: f[2],
            timePosition: f[3],
            lastContact: f[4],
            longitude: f[5],
            latitude: f[6],
            baroAltitude: f[7],
            onGround: f[8],
            velocity: f[9],
            trueTrack: f[10],
            verticalRate: f[11],
            sensors: f[12],
            geoAltitude: f[13],
            squawk: f[14],
            spi: f[15],
            positionSource: f[16],
            category: f[17],
        }));
        flights = flights.filter((f) => !f.onGround);
        this.flightsCache.set(url, { ts: Date.now(), data: flights });
        console.info(`${flights.length} flights retrieved from OpenSky`);
        //this.checkCredits().then(() => {});
        return flights;
    }
}
