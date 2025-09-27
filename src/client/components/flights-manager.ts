import type { FlightData } from './flight-data';

export class FlightsManager {
    private flights: FlightData[] = [];

    public async fetchFlights(
        centerLat: number,
        centerLng: number,
        squareSize: number
    ): Promise<FlightData[]> {
        try {
            const url = `/api/flights?lat=${centerLat}&lng=${centerLng}&size=${squareSize}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
            }
            const flights: FlightData[] = await response.json();
            this.flights = flights.filter((f) => !f.onGround);
            console.info('flights:', this.flights);
        } catch (error) {
            console.error('Failed to fetch flights:', error);
            this.flights = [];
        }
        return this.flights;
    }
}
