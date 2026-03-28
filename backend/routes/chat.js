const express = require('express');
const router = express.Router();
const { loadCSV } = require('../services/dataLoader');
const { getWaitTimes } = require('../services/waitTimeService');

// =========================================================
// Configuration & LLM Helper
// =========================================================

// Ensure this is set in your .env file
const LLM_API_KEY = process.env.OPENROUTER_API_KEY; 

/**
 * Generic LLM wrapper using native Node.js fetch configured for OpenRouter.
 */
async function callLLM(systemPrompt, userMessage, jsonMode = false) {
    if (!LLM_API_KEY) {
        throw new Error("LLM API Key is missing. Please set OPENROUTER_API_KEY in your .env file.");
    }

    const payload = {
        // OpenRouter requires the provider prefix
        model: "openai/gpt-4o-mini", 
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        temperature: 0.3
    };

    if (jsonMode) {
        payload.response_format = { type: "json_object" };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLM_API_KEY}`,
            'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:5000', 
            'X-Title': 'Aqua Imagicaa Assistant' 
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return jsonMode ? JSON.parse(content) : content;
}

// =========================================================
// Helper Functions
// =========================================================
const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// =========================================================
// Main Chat Route
// =========================================================
router.post('/', async (req, res) => {
    try {
        const { message, itinerary } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        // ---------------------------------------------------------
        // STEP 1: Intent Detection using LLM (The Router)
        // ---------------------------------------------------------
        const intentPrompt = `
            You are an intent extraction engine for a water park assistant.
            Analyze the user's message and determine their intent from this exact list:
            ["next_ride", "least_crowded", "break_suggestion", "best_ride", "remaining_plan", "unknown"]
            
            Return ONLY valid JSON in this format:
            {
                "intent": "string",
                "entities": {}
            }
        `;

        let intentData;
        try {
            intentData = await callLLM(intentPrompt, message, true);
        } catch (llmError) {
            console.error("LLM Intent Error:", llmError);
            // Fallback safely if LLM fails
            intentData = { intent: "unknown", entities: {} }; 
        }

        const intent = intentData.intent;

        // ---------------------------------------------------------
        // STEP 2: Backend Logic (The Source of Truth)
        // ---------------------------------------------------------
        const ridesData = await loadCSV('ride_metadata.csv');
        const amenitiesData = await loadCSV('smart_amenities_wait_times.csv');
        const waitTimesState = getWaitTimes();

        let dataPayload = null;

        switch (intent) {
            case 'next_ride':
                if (itinerary && itinerary.plan && itinerary.plan.length > 0) {
                    dataPayload = itinerary.plan[0]; // Immediate next item
                }
                break;

            case 'least_crowded':
                if (waitTimesState && waitTimesState.rides) {
                    let minWait = Infinity;
                    let fastestRideId = null;

                    for (const [rideId, waitData] of Object.entries(waitTimesState.rides)) {
                        if (waitData.wait_time < minWait) {
                            minWait = waitData.wait_time;
                            fastestRideId = rideId;
                        }
                    }

                    const fastestRide = ridesData.find(r => r.ride_id === fastestRideId);
                    if (fastestRide) {
                        dataPayload = { ride_id: fastestRideId, name: fastestRide.name, wait_time: minWait };
                    }
                }
                break;

            case 'break_suggestion':
                const uniqueAmenities = new Map();
                for (const row of amenitiesData) {
                    if (!uniqueAmenities.has(row.amenity_id)) uniqueAmenities.set(row.amenity_id, row);
                }

                const currentX = (itinerary && itinerary.plan && itinerary.plan[0]?.location_x) || 50;
                const currentY = (itinerary && itinerary.plan && itinerary.plan[0]?.location_y) || 50;

                let nearestAmenity = null;
                let minDistance = Infinity;

                for (const am of uniqueAmenities.values()) {
                    const dist = getDistance(currentX, currentY, parseInt(am.location_x, 10) || 0, parseInt(am.location_y, 10) || 0);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestAmenity = am;
                    }
                }

                if (nearestAmenity) {
                    dataPayload = {
                        name: nearestAmenity.name,
                        type: nearestAmenity.type,
                        wait_time: parseFloat(nearestAmenity.avg_wait_time_min) || 0,
                        location_x: nearestAmenity.location_x,
                        location_y: nearestAmenity.location_y
                    };
                }
                break;

            case 'best_ride':
                if (waitTimesState && waitTimesState.rides) {
                    let bestRide = null;
                    let maxScore = -Infinity;

                    ridesData.forEach(ride => {
                        const waitInfo = waitTimesState.rides[ride.ride_id];
                        const waitTime = waitInfo ? waitInfo.wait_time : 0;
                        const popularity = parseFloat(ride.popularity_score) || 0.5;
                        
                        const score = popularity - (waitTime / 60); 

                        if (score > maxScore) {
                            maxScore = score;
                            bestRide = { ...ride, wait_time: waitTime };
                        }
                    });

                    if (bestRide) dataPayload = bestRide;
                }
                break;

            case 'remaining_plan':
                if (itinerary && itinerary.plan) {
                    dataPayload = {
                        total_remaining: itinerary.plan.length,
                        upcoming_stops: itinerary.plan.slice(0, 3).map(p => p.name)
                    };
                }
                break;
        }

        // ---------------------------------------------------------
        // STEP 3: Final Response using LLM (The Generator)
        // ---------------------------------------------------------
        const generationPrompt = `
            You are a highly enthusiastic, helpful AI assistant for the Aqua Imagicaa Water Park.
            The user asked a question, and the backend system has retrieved the factual data to answer it.
            
            Intent Identified: ${intent}
            Backend Data: ${JSON.stringify(dataPayload)}
            
            Rules:
            1. Write a natural, friendly response using ONLY the provided Backend Data.
            2. Do NOT invent wait times, ride names, or locations.
            3. If the Backend Data is null or empty, politely apologize and say the data isn't currently available or they don't have an active itinerary.
            4. Keep the response concise (1-3 sentences maximum).
        `;

        let finalReply;
        try {
            finalReply = await callLLM(generationPrompt, message, false);
        } catch (llmError) {
            console.error("LLM Generation Error:", llmError);
            finalReply = "I found the data you need, but I'm having trouble formulating a response right now!";
        }

        // ---------------------------------------------------------
        // STEP 4: Return formatted payload
        // ---------------------------------------------------------
        res.json({
            reply: finalReply,
            intent_detected: intent,
            data: dataPayload
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "An unexpected error occurred in the chat service." });
    }
});

module.exports = router;