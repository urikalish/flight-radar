import { Router, type Request, type Response } from 'express';
import { FlightsService } from '../services/flights-service';

export const apiRouter = Router();

const flightsService = new FlightsService();

apiRouter.get('/flights', async (_req: Request, res: Response) => {
    try {
        const { lat, lng, size } = _req.query;
        const flights = await flightsService.getFlights(Number(lat), Number(lng), Number(size));
        res.json(flights);
    } catch (_error) {
        res.status(500).json({ error: 'Failed to fetch flights' });
    }
});
