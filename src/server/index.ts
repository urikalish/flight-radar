import express from 'express';
import type { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 7879;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Type-safe middleware wrapper
function useMiddleware(middleware: unknown): RequestHandler {
    return middleware as RequestHandler;
}

// Security middleware - Helmet
app.use(
    useMiddleware(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    connectSrc: [
                        "'self'",
                        'data:',
                        'https://maps.googleapis.com',
                        'https://*.googleapis.com',
                        'https://*.gstatic.com',
                    ],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        "'wasm-unsafe-eval'",
                        'https://maps.googleapis.com',
                        'https://maps.gstatic.com',
                    ],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    imgSrc: [
                        "'self'",
                        'data:',
                        'https:',
                        'https://maps.googleapis.com',
                        'https://maps.gstatic.com',
                        'https://*.googleapis.com',
                        'https://*.gstatic.com',
                    ],
                    workerSrc: ["'self'", 'blob:'],
                },
            },
        })
    )
);

// Compression middleware
app.use(useMiddleware(compression()));

// CORS configuration
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (isDevelopment) {
            // Allow any origin in development
            callback(null, true);
        } else {
            // In production, check against allowed origins
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
                'http://localhost:7879',
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(useMiddleware(cors(corsOptions)));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
const rootDir = path.join(__dirname, '..');

// Serve compiled client JavaScript
app.use(
    '/js',
    express.static(path.join(rootDir, 'dist-client'), {
        maxAge: 0,
        etag: true,
        extensions: ['js'],
    })
);

// Serve CSS files
app.use(
    '/css',
    express.static(path.join(rootDir, 'public/css'), {
        maxAge: 0,
        etag: true,
        extensions: ['css'],
    })
);

// Serve static assets (images, fonts, etc.)
app.use(
    '/assets',
    express.static(path.join(rootDir, 'public/assets'), {
        maxAge: 0,
        etag: true,
    })
);

// Serve root public directory for other static files
app.use(
    express.static(path.join(rootDir, 'public'), {
        index: 'index.html',
        maxAge: 0,
        etag: true,
    })
);

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
    });
});

// 404 handler for API routes
app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(rootDir, 'public/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Internal Server Error');
        }
    });
});

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler:', err.stack);

    // Check if it's a CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }

    // Generic error response
    res.status(500).json({
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
    });
    return res.status(403).json({ error: 'Error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
    console.info(`
Server started successfully!
URL: http://localhost:${PORT}
Environment: ${isDevelopment ? 'development' : 'production'}
Process ID: ${process.pid}
`);
});

// Handle server errors
server.on('error', (error: Error & { code?: string }) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

export default app;
