import type { FlightData } from './flight-data';
import { Units } from './units';
import { Helper } from './helper';

export class MapManager {
    private readonly airportCenterPoint = { lat: 32.012, lng: 34.887 };
    public readonly mapCenterPoint = {
        lat: this.airportCenterPoint.lat,
        lng: this.airportCenterPoint.lng,
    };
    private readonly mapSizePixels = 700;
    public readonly SQUARE_SIZE_KM = 500;
    private readonly RANGE_RING_START_NM = 20;
    private readonly RANGE_RING_INTERVAL_NM = 20;
    private readonly RANGE_RING_END_NM = 100;
    private readonly ANGLE_MARKER_INTERVAL = 10;
    private readonly ANGLE_MARKER_OFFSET_X = 15;
    private readonly ANGLE_MARKER_OFFSET_Y = 10;
    private readonly ROTATION_OFFSET = 180;
    private readonly MAP_ZOOM_INIT = 8;
    private readonly MAP_ZOOM_MIN = 8;
    private readonly MAP_ZOOM_MAX = 14;
    private map: google.maps.Map | null = null;
    private flightsMarkers: Map<string, google.maps.marker.AdvancedMarkerElement> = new Map();
    private trackedFlightICAO24 = '';

    public initMap() {
        const mapElm = document.getElementById('map') as HTMLElement;
        if (!mapElm) return;
        mapElm.style.width = `${this.mapSizePixels}px`;
        mapElm.style.height = `${this.mapSizePixels}px`;
        this.map = new google.maps.Map(mapElm, {
            mapId: '12a2c8dd1539caccd2d3fe1c',
            zoom: this.MAP_ZOOM_INIT,
            center: this.mapCenterPoint,
            colorScheme: 'DARK',
            disableDefaultUI: true,
            gestureHandling: 'none',
            keyboardShortcuts: false,
            zoomControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
        });
        this.createAirportMarker();
        this.createRangeRings();
        this.createAngleMarks();
        const infoElm = document.getElementById('info-pane') as HTMLDivElement;
        if (infoElm) {
            infoElm.addEventListener('click', () => {
                this.untrackFlight();
            });
        }
        setTimeout(() => {
            const mapContainerElm = document.getElementById('map-container');
            if (mapContainerElm) {
                mapContainerElm.classList.remove('visibility--hidden');
            }
        }, 1000);
    }

    private createAirportMarker() {
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: this.airportCenterPoint,
            map: this.map,
            content: document.createElement('div'),
            title: `Ben Gurion Airport`,
        });
        marker.element.classList.add('map-marker-airport');
    }

    private createRangeRings() {
        if (!this.map) return;
        for (
            let nm = this.RANGE_RING_START_NM;
            nm <= this.RANGE_RING_END_NM;
            nm += this.RANGE_RING_INTERVAL_NM
        ) {
            new google.maps.Circle({
                strokeColor: '#222',
                strokeWeight: 1,
                fillColor: 'transparent',
                map: this.map,
                center: this.airportCenterPoint,
                radius: nm * Units.NAUTICAL_MILES_TO_METERS,
                clickable: false,
            });
        }
    }

    private createAngleMarks() {
        const container = document.getElementById('map');
        if (!container) return;
        const centerX = this.mapSizePixels / 2;
        const centerY = this.mapSizePixels / 2;
        const radius = this.mapSizePixels / 2 - 20;
        for (let angle = 0; angle < 360; angle += this.ANGLE_MARKER_INTERVAL) {
            const radians = (angle - 90) * (Math.PI / 180);
            const x = centerX + radius * Math.cos(radians);
            const y = centerY + radius * Math.sin(radians);
            const marker = document.createElement('div');
            marker.className = 'angle-marker';
            marker.textContent = `${angle}°`;
            marker.style.left = `${x - this.ANGLE_MARKER_OFFSET_X}px`;
            marker.style.top = `${y - this.ANGLE_MARKER_OFFSET_Y}px`;
            container.appendChild(marker);
        }
    }

    private updateFlightMarker(f: FlightData, m: google.maps.marker.AdvancedMarkerElement) {
        m.position = { lat: f.latitude ?? 0, lng: f.longitude ?? 0 };
        m.title = `${f.callsign} (${f.originCountry})`;
        if (f.trueTrack !== null) {
            const rotation = Math.round(Number(f.trueTrack)) + this.ROTATION_OFFSET;
            m.element.style.setProperty('--rotation', `${rotation}deg`);
        }
        const altInfo = Helper.to3Digits(
            Math.round(((f.baroAltitude ?? 0) * Units.METERS_TO_FEET) / 100)
        );
        let climbArrow = '';
        if (f.verticalRate && f.verticalRate !== 0) {
            climbArrow = f.verticalRate > 0 ? '↑' : '↓';
        }
        const speedInfo = Helper.to3Digits(
            Math.round((f.velocity ?? 0) * Units.METERS_PER_SECOND_TO_KNOTS)
        );
        m.element.dataset.infoLine1 = f.callsign || '???';
        m.element.dataset.infoLine2 = `${altInfo}${climbArrow} ${speedInfo}`;
    }

    private removeFlightMarker(icao24: string) {
        const m = this.flightsMarkers.get(icao24);
        if (m) {
            google.maps.event.clearInstanceListeners(m);
            m.map = null;
            this.flightsMarkers.delete(icao24);
        }
    }

    private createFlightMarker(f: FlightData): google.maps.marker.AdvancedMarkerElement {
        const m = new google.maps.marker.AdvancedMarkerElement({
            map: this.map,
            content: document.createElement('div'),
        });
        m.element.classList.add('map-marker-flight');
        this.updateFlightMarker(f, m);
        m.addListener('click', () => {
            this.handleFlightClicked(f, m);
        });
        return m;
    }

    public updateFlights(flights: FlightData[]) {
        if (!this.map) return;
        const flightsToRemove = new Set<string>();
        for (const icao24 of this.flightsMarkers.keys()) {
            flightsToRemove.add(icao24);
        }
        flights.forEach((f) => {
            const existingMarker = this.flightsMarkers.get(f.icao24);
            if (existingMarker) {
                this.updateFlightMarker(f, existingMarker);
                flightsToRemove.delete(f.icao24);
            } else {
                const newMarker = this.createFlightMarker(f);
                this.flightsMarkers.set(f.icao24, newMarker);
            }
        });
        flightsToRemove.forEach((icao24: string) => {
            this.removeFlightMarker(icao24);
        });
        const trackedFlight = flights.find((f) => f.icao24 === this.trackedFlightICAO24);
        if (trackedFlight) {
            const m = this.flightsMarkers.get(trackedFlight.icao24);
            if (m) {
                this.trackFlight(trackedFlight, m);
            }
        } else {
            this.untrackFlight();
        }
    }

    private untrackFlight() {
        this.flightsMarkers.forEach((m) => {
            m.element.classList.remove('selected');
        });
        const elm = document.getElementById('info-pane') as HTMLDivElement;
        if (!elm) return;
        elm.textContent = '';
        elm.classList.add('display--none');
        this.trackedFlightICAO24 = '';
    }

    private trackFlight(f: FlightData, m: google.maps.marker.AdvancedMarkerElement) {
        this.untrackFlight();
        this.trackedFlightICAO24 = f.icao24;
        m.element.classList.add('selected');
        const elm = document.getElementById('info-pane') as HTMLDivElement;
        const altStr = `${Math.round((f.baroAltitude ?? 0) * Units.METERS_TO_FEET)} ft`;
        const vr = Math.round((f.verticalRate ?? 0) * Units.METERS_TO_FEET);
        const vrStr = vr === 0 ? '' : vr > 0 ? `+${vr} ft/min` : `${vr} ft/min`;
        const trackStr = `${f.trueTrack ? Math.round(f.trueTrack) : 'N/A'}°`;
        const speedStr = `${Math.round((f.velocity ?? 0) * Units.METERS_PER_SECOND_TO_KNOTS)} kts`;
        const registrationStr = `${f.planeRegistration} ${f.originCountry}`.trim() || 'N/A';
        const modelStr = `${f.planeTypeCode} ${f.planeModel}`.trim() || 'N/A';
        const infoLines = [
            `Call/ICAO24: ${f.callsign} / ${f.icao24}`,
            `Reg: ${registrationStr}`,
            `Model: ${modelStr}`,
            `Altitude: ${altStr} ${vrStr}`,
            `Position: ${f.latitude}, ${f.longitude}`,
            `Track/Speed: ${trackStr} / ${speedStr}`,
        ];
        elm.textContent = infoLines.join('\n');
        elm.classList.remove('display--none');
    }

    private handleFlightClicked(f: FlightData, m: google.maps.marker.AdvancedMarkerElement) {
        this.trackFlight(f, m);
    }

    public zoomIn() {
        if (!this.map) return;
        const z = this.map.getZoom() || this.MAP_ZOOM_INIT;
        if (z < this.MAP_ZOOM_MAX) {
            this.map.setZoom(z + 1);
        }
    }

    public zoomOut() {
        if (!this.map) return;
        const z = this.map.getZoom() || this.MAP_ZOOM_INIT;
        if (z > this.MAP_ZOOM_MIN) {
            this.map.setZoom(z - 1);
        }
    }
}
