const express = require('express');
const router = express.Router();
const { loadCSV } = require('../services/dataLoader');
const { getWaitTimes } = require('../services/waitTimeService');

// ---------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------
const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// ---------------------------------------------------------
// Core Business Logic
// ---------------------------------------------------------
const generateItineraryPlan = async ({ age_group, thrill_preference, visit_duration_hours }) => {
    
    // 1. Fetch Data 
    const ridesData = await loadCSV('ride_metadata.csv'); 
    const amenitiesDataRaw = await loadCSV('smart_amenities_wait_times.csv');
    const waitTimesState = getWaitTimes();

    if (!waitTimesState || !waitTimesState.rides) {
        throw new Error("WAIT_TIMES_UNAVAILABLE");
    }

    // 2. Deduplicate Time-Series Amenities
    const uniqueAmenitiesMap = new Map();
    for (const row of amenitiesDataRaw) {
        if (!uniqueAmenitiesMap.has(row.amenity_id)) {
            uniqueAmenitiesMap.set(row.amenity_id, {
                amenity_id: row.amenity_id,
                type: row.type,
                name: row.name,
                location_x: parseInt(row.location_x, 10) || 0,
                location_y: parseInt(row.location_y, 10) || 0,
                avg_wait_time: parseFloat(row.avg_wait_time_min) || 0 
            });
        }
    }
    const uniqueAmenities = Array.from(uniqueAmenitiesMap.values());

    // 3. Format Ride Data
    let availableRides = ridesData.map(ride => {
        const liveWaitData = waitTimesState.rides[ride.ride_id];
        return {
            ...ride,
            intensity_level: parseInt(ride.intensity_level, 10) || 1,
            actual_wait_time: liveWaitData ? liveWaitData.wait_time : 0,
            location_x: parseInt(ride.location_x, 10) || 0,
            location_y: parseInt(ride.location_y, 10) || 0
        };
    });

    // 4. Filter by Age Group
    availableRides = availableRides.filter(ride => {
        if (age_group === 'kids') return ride.intensity_level <= 2;
        if (age_group === 'mixed') return ride.intensity_level <= 4;
        return true; 
    });

    // 5. Initialize Single-Pass Algorithm State
    const visit_duration_mins = visit_duration_hours * 60;
    let current_total_time = 0;
    let time_since_last_break = 0;
    let current_x = 50; 
    let current_y = 50;
    
    const visitedRides = new Set();
    const usedAmenities = new Set();
    const plan = [];
    let order = 1;

    // 6. Core Simulation Loop
    while (current_total_time < visit_duration_mins) {
        
        // --- STEP A: Check for Breaks ---
        if (time_since_last_break >= 120 && plan.length > 0) {
            let nearestFood = null, minFoodDist = Infinity;
            let nearestRest = null, minRestDist = Infinity;

            for (const am of uniqueAmenities) {
                if (usedAmenities.has(am.amenity_id)) continue;
                
                const dist = getDistance(current_x, current_y, am.location_x, am.location_y);
                if (am.type === 'food' && dist < minFoodDist) {
                    minFoodDist = dist; nearestFood = am;
                } else if (am.type === 'rest_area' && dist < minRestDist) {
                    minRestDist = dist; nearestRest = am;
                }
            }

            let breakAmenity = nearestFood || nearestRest;

            if (!breakAmenity) {
                usedAmenities.clear();
                for (const am of uniqueAmenities) {
                    const dist = getDistance(current_x, current_y, am.location_x, am.location_y);
                    if (am.type === 'food' && dist < minFoodDist) {
                        minFoodDist = dist; nearestFood = am;
                    } else if (am.type === 'rest_area' && dist < minRestDist) {
                        minRestDist = dist; nearestRest = am;
                    }
                }
                breakAmenity = nearestFood || nearestRest;
            }

            if (breakAmenity) {
                const amenityWait = breakAmenity.avg_wait_time;
                const breakTimeTaken = amenityWait + 20;

                if (current_total_time + breakTimeTaken <= visit_duration_mins) {
                    plan.push({
                        type: breakAmenity.type,
                        name: breakAmenity.name,
                        expected_wait: amenityWait,
                        location_x: breakAmenity.location_x, 
                        location_y: breakAmenity.location_y, 
                        order: order++
                    });
                    
                    current_total_time += breakTimeTaken;
                    time_since_last_break = 0;
                    usedAmenities.add(breakAmenity.amenity_id);
                    current_x = breakAmenity.location_x;
                    current_y = breakAmenity.location_y;
                    continue; 
                } else {
                    time_since_last_break = 0;
                }
            }
        }

        // --- STEP B: Find Best Ride ---
        let bestRide = null;
        let bestScore = -Infinity;

        for (const ride of availableRides) {
            if (visitedRides.has(ride.ride_id)) continue;

            const timeTaken = ride.actual_wait_time + 5;
            if (current_total_time + timeTaken > visit_duration_mins) continue;

            const preference_match = 1 - Math.abs(thrill_preference - (ride.intensity_level / 5));
            const wait_penalty = ride.actual_wait_time / 60;
            const distance_penalty = getDistance(current_x, current_y, ride.location_x, ride.location_y) / 100;
            const score = preference_match - wait_penalty - distance_penalty;

            if (score > bestScore) {
                bestScore = score;
                bestRide = ride;
            }
        }

        // --- Exhaustion Fallback ---
        if (!bestRide) {
            let fallbackRide = null;
            let fallbackScore = -Infinity;
            
            for (const ride of availableRides) {
                const timeTaken = ride.actual_wait_time + 5;
                if (current_total_time + timeTaken > visit_duration_mins) continue;

                const preference_match = 1 - Math.abs(thrill_preference - (ride.intensity_level / 5));
                const wait_penalty = ride.actual_wait_time / 60;
                const distance_penalty = getDistance(current_x, current_y, ride.location_x, ride.location_y) / 100;
                const score = preference_match - wait_penalty - distance_penalty;

                if (score > fallbackScore) {
                    fallbackScore = score;
                    fallbackRide = ride;
                }
            }

            if (fallbackRide) {
                visitedRides.clear(); 
                bestRide = fallbackRide;
            } else {
                break; 
            }
        }

        // --- STEP C: Add Ride to Plan ---
        const rideTimeTaken = bestRide.actual_wait_time + 5;
        visitedRides.add(bestRide.ride_id);
        
        current_total_time += rideTimeTaken;
        time_since_last_break += rideTimeTaken;
        current_x = bestRide.location_x;
        current_y = bestRide.location_y;

        plan.push({
            type: "ride",
            ride_id: bestRide.ride_id,
            name: bestRide.name,
            expected_wait: bestRide.actual_wait_time,
            order: order++
        });
    }

    return {
        plan: plan,
        total_time: Number(current_total_time.toFixed(2)),
        current_index: 0,
        remaining_plan: plan,
        remaining_time: Number(current_total_time.toFixed(2))
    };
};

// ---------------------------------------------------------
// Middleware: Input Validation
// ---------------------------------------------------------
const validateItineraryInput = (req, res, next) => {
    const { age_group, thrill_preference, visit_duration_hours } = req.body;

    if (!age_group || thrill_preference === undefined || !visit_duration_hours) {
        return res.status(400).json({ error: "Missing required fields." });
    }
    if (!['kids', 'adults', 'mixed'].includes(age_group)) {
        return res.status(400).json({ error: "Invalid age_group." });
    }
    if (typeof thrill_preference !== 'number' || thrill_preference < 0 || thrill_preference > 1) {
        return res.status(400).json({ error: "Invalid thrill_preference. Must be between 0 and 1." });
    }
    if (typeof visit_duration_hours !== 'number' || visit_duration_hours <= 0) {
        return res.status(400).json({ error: "Invalid visit_duration_hours." });
    }
    next();
};

// ---------------------------------------------------------
// API Routes
// ---------------------------------------------------------

router.post('/', validateItineraryInput, async (req, res) => {
    try {
        const result = await generateItineraryPlan(req.body);
        res.json(result);
    } catch (error) {
        if (error.message === "WAIT_TIMES_UNAVAILABLE") return res.status(503).json({ error: "Initializing..." });
        res.status(500).json({ error: "Failed to generate itinerary." });
    }
});

router.post('/plan-itinerary', validateItineraryInput, async (req, res) => {
    try {
        const result = await generateItineraryPlan(req.body);
        res.json(result);
    } catch (error) {
        if (error.message === "WAIT_TIMES_UNAVAILABLE") return res.status(503).json({ error: "Initializing..." });
        res.status(500).json({ error: "Failed to plan itinerary." });
    }
});

// NEW ROUTE: Progress incrementer
router.post('/next', (req, res) => {
    try {
        const { plan, current_index } = req.body;

        if (!plan || !Array.isArray(plan) || current_index === undefined) {
            return res.status(400).json({ error: "Invalid payload. 'plan' and 'current_index' are required." });
        }

        const next_index = current_index + 1;
        
        // 1. Slice off the past items
        const remaining_plan = plan.slice(next_index);
        
        // 2. Mathematically compute the remaining minutes left in the day
        let remaining_time = 0;
        for (const item of remaining_plan) {
            const duration = item.type === 'ride' ? 5 : 20; // assumed 5 mins to ride, 20 mins to eat
            remaining_time += ((parseFloat(item.expected_wait) || 0) + duration);
        }

        // 3. Return updated snapshot to frontend
        res.json({
            plan: plan, // Keep original intact
            current_index: next_index,
            remaining_plan: remaining_plan,
            remaining_time: Number(remaining_time.toFixed(2))
        });

    } catch (error) {
        console.error("Error processing /next:", error);
        res.status(500).json({ error: "Failed to update itinerary progress." });
    }
});

module.exports = router;