require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initCrowdSimulator } = require('./services/crowdSimulator');
const { initWaitTimeService, calculateWaitTimes } = require('./services/waitTimeService');

const ridesRouter = require('./routes/rides');
const crowdRouter = require('./routes/crowd');
const waitTimesRouter = require('./routes/waitTimes');
const itineraryRouter = require('./routes/itinerary');
const amenitiesRouter = require('./routes/amenities');
const chatRouter = require('./routes/chat');

const app = express();

// CORS Configuration - Allow frontend from specified origin or all origins
// In production, set CORS_ORIGIN to your Vercel domain (e.g., "https://myapp.vercel.app")
// Locally or without env var, allows all origins for development
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Middleware: Request logging in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/itinerary', itineraryRouter);
app.use('/amenities', amenitiesRouter);
app.use('/chat', chatRouter);
app.use('/rides', ridesRouter);
app.use('/crowd', crowdRouter);
app.use('/wait-times', waitTimesRouter);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Global Error Handler
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`);
    if (!isProduction) console.error(err.stack);
    
    const statusCode = err.statusCode || 500;
    const errorResponse = {
        error: isProduction ? 'Internal Server Error' : err.message,
        timestamp: new Date().toISOString()
    };
    
    res.status(statusCode).json(errorResponse);
});

const PORT = process.env.PORT || 5000;

const bootServer = async () => {
    try {
        // Load static metadata for wait times
        await initWaitTimeService(); 
        
        // Start the crowd simulator
        await initCrowdSimulator(calculateWaitTimes); 
        
        app.listen(PORT, () => {
            const baseUrl = `http://localhost:${PORT}`;
            console.log(`\n🌊 parkflow Backend is live on ${baseUrl}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`\nEndpoints:`);
            console.log(`- Health:            ${baseUrl}/health`);
            console.log(`- Layout Data:       ${baseUrl}/rides`);
            console.log(`- Live Crowd Data:   ${baseUrl}/crowd`);
            console.log(`- Live Wait Times:   ${baseUrl}/wait-times`);
            console.log(`- Itinerary Planner: ${baseUrl}/itinerary`);
            console.log(`- Amenities Data:    ${baseUrl}/amenities`);
            console.log(`- AI Chat:           ${baseUrl}/chat\n`);
        });
    } catch (err) {
        console.error("🔥 Critical failure during server boot sequence:");
        console.error(err.message);
        if (process.env.NODE_ENV !== 'production') console.error(err.stack);
        process.exit(1); 
    }
};

bootServer();