const { loadCSV } = require('./dataloader');

// ---------------------------------------------------------
// Configuration & Constants
// ---------------------------------------------------------
const ML_API_URL = 'http://localhost:5001/predict';
const MAX_WAIT_TIME_MINS = 120;  
const MIN_WAIT_TIME_MINS = 0;    

// ---------------------------------------------------------
// In-Memory State
// ---------------------------------------------------------
let rideMetadataCache = {};

/**
 * Stores the calculated wait times.
 * Structure: 
 * {
 * timestamp: "2026-03-25T10:05:00.000Z",
 * rides: { "AQ01": { wait_time: 15.5 }, ... }
 * }
 */
let liveWaitTimesState = {
    timestamp: null,
    rides: {}
};

// ---------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------

/**
 * Adds realistic noise (+/- 2 mins) for the mathematical fallback.
 */
const addWaitTimeNoise = (baseWaitTime) => {
    if (baseWaitTime <= 0) return 0;
    const noise = (Math.random() * 4) - 2;
    return baseWaitTime + noise;
};

/**
 * Fetches the predicted wait time from the Python FastAPI microservice.
 * @param {string} rideId - The ID of the ride
 * @param {number} crowdLevel - The 0.0 to 1.0 crowd level
 * @param {number} currentHour - The current 24-hour time
 * @returns {Promise<number>} - The predicted wait time
 */
const fetchMLPrediction = async (rideId, crowdLevel, currentHour) => {
    const payload = {
        ride_id: rideId,
        crowd_level: crowdLevel,
        time_of_day: currentHour
    };

    const response = await fetch(ML_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`ML API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.predicted_wait_time;
};

// ---------------------------------------------------------
// Core Logic
// ---------------------------------------------------------

/**
 * Calculates wait times based on the EXACT snapshot provided by the Crowd Simulator.
 * Attempts to use the ML Microservice first, with a mathematical fallback.
 * * @param {Object} liveCrowdSnapshot - { timestamp: "...", rides: { ... } }
 */
const calculateWaitTimes = async (liveCrowdSnapshot) => {
    if (Object.keys(rideMetadataCache).length === 0) return;

    // Inherit the exact timestamp from the crowd simulator
    liveWaitTimesState.timestamp = liveCrowdSnapshot.timestamp;
    
    // We need the current hour for the ML model (e.g., 14 for 2 PM)
    const currentHour = new Date(liveCrowdSnapshot.timestamp).getHours();

    console.log(`\n[SYNC DEBUG] Crowd T: ${liveCrowdSnapshot.timestamp} | Wait T: ${liveWaitTimesState.timestamp}`);

    // Create an array of promises so we can fetch all predictions concurrently
    const predictionPromises = Object.keys(liveCrowdSnapshot.rides).map(async (rideId) => {
        const crowdData = liveCrowdSnapshot.rides[rideId];
        const rideMeta = rideMetadataCache[rideId];

        if (!rideMeta || rideMeta.capacity <= 0) {
            return { rideId, waitTime: 0 };
        }

        let finalWaitTime = 0;

        try {
            // --- Primary System: Machine Learning Prediction ---
            finalWaitTime = await fetchMLPrediction(rideId, crowdData.crowd_level, currentHour);
            console.log(`[🤖 ML ACTIVE] ${rideId} -> Predicted: ${finalWaitTime} mins`); 
            
        } catch (error) {
            // --- Fallback System: Mathematical Calculation ---
            console.warn(`[🧮 FALLBACK ACTIVE] ML failed for ${rideId} (${error.message}). Using Math.`);
            
            const peopleInQueue = crowdData.people_in_queue || 0;
            const baseWaitTime = (peopleInQueue / rideMeta.capacity) * rideMeta.cycle_time;
            finalWaitTime = addWaitTimeNoise(baseWaitTime);
        }

        // Clamp the final result to boundaries
        finalWaitTime = Math.max(MIN_WAIT_TIME_MINS, Math.min(finalWaitTime, MAX_WAIT_TIME_MINS));

        return {
            rideId,
            waitTime: Number(finalWaitTime.toFixed(2))
        };
    });

    // Wait for all ride predictions/calculations to finish for this tick
    const results = await Promise.all(predictionPromises);

    // Update the master state object synchronously
    results.forEach(({ rideId, waitTime }) => {
        liveWaitTimesState.rides[rideId] = { wait_time: waitTime };
    });
};

// ---------------------------------------------------------
// Initialization & Exports
// ---------------------------------------------------------

const getWaitTimes = () => {
    return liveWaitTimesState;
};

const initWaitTimeService = async () => {
    try {
        console.log("⏳ Initializing Wait Time Metadata...");
        
        const ridesData = await loadCSV('waterpark_wait_time_dataset.csv');
        
        if (!ridesData || ridesData.length === 0) {
            throw new Error("No data found in ride metadata CSV.");
        }

        ridesData.forEach(row => {
            if (!rideMetadataCache[row.ride_id]) {
                rideMetadataCache[row.ride_id] = {
                    capacity: parseInt(row.capacity_per_cycle || row.capacity, 10) || 10,
                    cycle_time: parseFloat(row.cycle_time_min || row.cycle_time) || 2.0 
                };
            }
        });

        console.log(`✅ Cached static metadata for ${Object.keys(rideMetadataCache).length} rides.`);
        
        // NOTE: Since the new implementation relies on a crowd snapshot, 
        // we no longer call calculateWaitTimes() here. 
        // We wait for the crowdSimulator to trigger it.

    } catch (error) {
        console.error("❌ Failed to initialize Wait Time Service:", error);
        throw error;
    }
};

module.exports = {
    initWaitTimeService,
    getWaitTimes,
    calculateWaitTimes 
};