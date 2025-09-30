import { MapManager } from './map-manager';
import { FlightsManager } from './flights-manager';

export class App {
    private readonly FLIGHTS_REFRESH_INITIAL_INTERVAL_SECS = 60;
    private flightsRefreshIntervalSecs = this.FLIGHTS_REFRESH_INITIAL_INTERVAL_SECS;
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
        this.updateRefreshFrequency(this.flightsRefreshIntervalSecs);
        this.isInitialized = true;
    }

    private updateRefreshFrequency(flightsRefreshIntervalSecs: number) {
        this.flightsRefreshIntervalSecs = flightsRefreshIntervalSecs;
        const refreshFrequencyInputElm = document.getElementById(
            'refreshFrequencyInput'
        ) as HTMLInputElement;
        if (refreshFrequencyInputElm) {
            refreshFrequencyInputElm.value = flightsRefreshIntervalSecs.toString();
        }
        const refreshFrequencyValueElm = document.getElementById('refreshFrequencyValue');
        if (refreshFrequencyValueElm) {
            refreshFrequencyValueElm.textContent = flightsRefreshIntervalSecs.toString();
        }
    }

    private setupEventListeners(): void {
        const refreshFrequencyInputElm = document.getElementById('refreshFrequencyInput');
        if (refreshFrequencyInputElm) {
            refreshFrequencyInputElm.addEventListener(
                'input',
                this.handleChangeRefreshFrequency.bind(this)
            );
        }
        document.querySelectorAll('[data-action]').forEach((element) => {
            element.addEventListener('click', this.handleActionClick.bind(this));
        });
    }

    private handleChangeRefreshFrequency(event: Event) {
        if (event) {
            this.updateRefreshFrequency(Number((event.target as HTMLInputElement).value));
        }
    }

    private handleActionClick(event: Event): void {
        const button = event.currentTarget as HTMLElement;
        const action = button.dataset.action;
        switch (action) {
            // case 'start-update':
            //     if (this.fetchFlightsTimeoutId) {
            //         window.clearTimeout(this.fetchFlightsTimeoutId);
            //     }
            //     this.updateFlights().then(() => {});
            //     break;
            // case 'stop-update':
            //     window.clearTimeout(this.fetchFlightsTimeoutId);
            //     this.fetchFlightsTimeoutId = 0;
            //     break;
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
        window.setTimeout(() => {
            this.updateFlights().then(() => {});
        }, this.flightsRefreshIntervalSecs * 1000);
    }
}
