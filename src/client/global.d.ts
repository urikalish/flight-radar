declare global {
    const google: typeof import('google.maps');
    interface Window {
        app: App;
        initMap: () => void;
        google: typeof import('google.maps');
    }
}

export {};
