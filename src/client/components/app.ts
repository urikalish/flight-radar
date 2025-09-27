import { MapManager } from './map-manager';
import { FlightsManager } from './flights-manager';

export class App {
    private readonly FLIGHTS_FETCH_INTERVAL = 60 * 1000;
    private fetchFlightsTimeoutId: number = 0;
    private isInitialized: boolean = false;
    private mapManager: MapManager;
    private flightsManager: FlightsManager;

    public constructor() {
        this.mapManager = new MapManager();
        this.flightsManager = new FlightsManager();
    }

    public initMap() {
        this.mapManager.initMap();
        this.updateFlights().then(() => {});
    }

    public initialize(): void {
        if (this.isInitialized) {
            return;
        }
        this.setupEventListeners();
        this.isInitialized = true;
    }

    private setupEventListeners(): void {
        document.querySelectorAll('[data-action]').forEach((element) => {
            element.addEventListener('click', this.handleActionClick.bind(this));
        });
    }

    private handleActionClick(event: Event): void {
        const button = event.currentTarget as HTMLElement;
        const action = button.dataset.action;
        switch (action) {
            case 'start-update':
                if (this.fetchFlightsTimeoutId) {
                    window.clearTimeout(this.fetchFlightsTimeoutId);
                }
                this.updateFlights().then(() => {});
                break;
            case 'stop-update':
                window.clearTimeout(this.fetchFlightsTimeoutId);
                this.fetchFlightsTimeoutId = 0;
                break;
            case 'zoom-in':
                this.mapManager.zoomIn();
                break;
            case 'zoom-out':
                this.mapManager.zoomOut();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    public async updateFlights() {
        try {
            const flights = await this.flightsManager.fetchFlights(
                this.mapManager.mapCenterPoint.lat,
                this.mapManager.mapCenterPoint.lng,
                this.mapManager.SQUARE_SIZE_KM
            );
            this.mapManager.updateFlights(flights);
        } catch (error) {
            console.error('Failed to update flights:', error);
        }
        this.fetchFlightsTimeoutId = window.setTimeout(() => {
            this.updateFlights().then(() => {});
        }, this.FLIGHTS_FETCH_INTERVAL);
    }
}
