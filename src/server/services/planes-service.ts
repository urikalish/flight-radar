import fs from 'fs';
import csv from 'csv-parser';

export type PlaneData = {
    planeRegistration: string;
    planeTypeCode: string;
    planeModel: string;
};

export class PlanesService {
    private planes: Map<string, PlaneData> = new Map();

    private normalizeStr(str: string) {
        return str ? str.replace(/'/g, '').trim() || '' : '';
    }

    public loadData() {
        console.info('Loading planes data...');
        const stream = fs
            .createReadStream('./data/planes.csv')
            .pipe(
                csv({
                    mapHeaders: ({ header }) => {
                        return header
                            .trim() // Remove whitespace
                            .replace(/'/g, '');
                    },
                })
            )
            .on('data', (data: any) => {
                const icao24 = this.normalizeStr(data.icao24);
                const manufacturerIcao = this.normalizeStr(data.manufacturerIcao);
                const manufacturerName = this.normalizeStr(data.manufacturerName);
                const model = this.normalizeStr(data.model);
                let planeModel = '';
                if (manufacturerIcao) {
                    if (
                        !manufacturerName
                            .toLowerCase()
                            .startsWith(manufacturerIcao.toLowerCase()) &&
                        !model.toLowerCase().startsWith(manufacturerIcao.toLowerCase())
                    ) {
                        planeModel += ` ${manufacturerIcao}`;
                    }
                }
                if (manufacturerName) {
                    if (!model.toLowerCase().startsWith(manufacturerName.toLowerCase())) {
                        planeModel += ` ${manufacturerName}`;
                    }
                }
                planeModel += ` ${model}`;
                this.planes.set(icao24, {
                    planeRegistration: this.normalizeStr(data.registration),
                    planeTypeCode: this.normalizeStr(data.typecode),
                    planeModel: this.normalizeStr(planeModel),
                });
            })
            .on('end', () => {
                console.info('Planes data loaded');
            })
            .on('error', (error: any) => {
                console.error('Error reading planes.csv:', error);
                stream.destroy();
            });
    }

    public getPlaneData(icao24: string): PlaneData | null {
        return this.planes.get(icao24) || null;
    }
}
