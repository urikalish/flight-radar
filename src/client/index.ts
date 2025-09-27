import { App } from './components/app';

window.app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init(): void {
    window.app.initialize();
}
