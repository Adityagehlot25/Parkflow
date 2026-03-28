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
app.use(cors());
app.use(express.json());
app.use('/itinerary', itineraryRouter);
app.use('/amenities', amenitiesRouter);
app.use('/chat', chatRouter);
app.use('/amenities', amenitiesRouter);
app.use('/rides', ridesRouter);
app.use('/crowd', crowdRouter);
app.use('/wait-times', waitTimesRouter);

app.use((err, req, res, next) => {
    console.error("Global Server Error:", err.stack);
    res.status(500).json({ error: 'Internal Server Error!' });
});

const PORT = process.env.PORT || 5000;

const bootServer = async () => {
    try {
        // 1. Load static metadata for wait times first
        await initWaitTimeService(); 
        
        // 2. Start the crowd simulator, and pass the calculation function 
        //    so it triggers on every single tick. Perfect Sync!
        await initCrowdSimulator(calculateWaitTimes); 
        
        app.listen(PORT, () => {
            console.log(`\n🌊 Water Park Backend is live on http://localhost:${PORT}`);
            console.log(`- Layout Data:     http://localhost:${PORT}/rides`);
            console.log(`- Live Crowd Data: http://localhost:${PORT}/crowd`);
            console.log(`- Live Wait Times: http://localhost:${PORT}/wait-times`);
            console.log(`- Itinerary Planner: http://localhost:${PORT}/itinerary`);
            console.log(`- Amenities Data:  http://localhost:${PORT}/amenities`);
        });
    } catch (err) {
        console.error("🔥 Critical failure during server boot sequence:", err);
        process.exit(1); 
    }
};

bootServer();