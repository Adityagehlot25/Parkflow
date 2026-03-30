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

        const msg = message.toLowerCase();
        let intent = 'unknown';

        // ---------------------------------------------------------
        // STEP 1: Intent Detection (LLM Primary, Keyword Fallback)
        // ---------------------------------------------------------
        const intentList = [
            "next_ride", "least_crowded", "best_ride", "break_suggestion", 
            "nearest_food", "remaining_plan", "time_remaining", "skip_suggestion", 
            "crowd_status", "progress_status", "recommendation_by_preference", "plan_summary", "unknown"
        ];

        const intentPrompt = `
            You are an intent extraction engine for a water park assistant.
            Analyze the user's message and determine their intent from this exact list:
            ${JSON.stringify(intentList)}
            
            Return ONLY valid JSON in this format:
            { "intent": "string" }
        `;

        try {
            const intentData = await callLLM(intentPrompt, message, true);
            if (intentList.includes(intentData.intent)) {
                intent = intentData.intent;
            }
        } catch (llmError) {
            console.warn("LLM Intent Router failed. Falling back to rule-based keyword matching.");
        }

        // FALLBACK: If LLM failed or returned 'unknown', use our blazing fast keyword logic
        if (intent === 'unknown') {
            if (['skip', 'avoid', 'longest', 'worst wait'].some(k => msg.includes(k))) intent = 'skip_suggestion';
            else if (['crowd', 'busy', 'packed', 'park status'].some(k => msg.includes(k))) intent = 'crowd_status';
            else if (['progress', 'done', 'finished', 'so far'].some(k => msg.includes(k))) intent = 'progress_status';
            else if (['preference', 'thrill', 'intensity', 'kid', 'child'].some(k => msg.includes(k))) intent = 'recommendation_by_preference';
            else if (['summary', 'overview', 'total plan'].some(k => msg.includes(k))) intent = 'plan_summary';
            else if (['time', 'how long', 'hours left', 'minutes left'].some(k => msg.includes(k))) intent = 'time_remaining';
            else if (['food', 'hungry', 'eat', 'lunch', 'dinner', 'snack'].some(k => msg.includes(k))) intent = 'nearest_food';
            else if (['break', 'rest', 'tired', 'sit'].some(k => msg.includes(k))) intent = 'break_suggestion';
            else if (['least', 'shortest', 'empty', 'fast', 'quick'].some(k => msg.includes(k))) intent = 'least_crowded';
            else if (['best', 'suggest', 'recommend', 'favorite'].some(k => msg.includes(k))) intent = 'best_ride';
            else if (['remaining', 'left', 'schedule'].some(k => msg.includes(k))) intent = 'remaining_plan';
            else if (['next', 'up next', 'after'].some(k => msg.includes(k))) intent = 'next_ride';
        }

        // ---------------------------------------------------------
        // STEP 2: Backend Logic (The Source of Truth)
        // ---------------------------------------------------------
        const ridesData = await loadCSV('ride_metadata.csv');
        const amenitiesData = await loadCSV('smart_amenities_wait_times.csv');
        const waitTimesState = getWaitTimes();

        const uniqueAmenities = new Map();
        for (const row of amenitiesData) {
            if (!uniqueAmenities.has(row.amenity_id)) uniqueAmenities.set(row.amenity_id, row);
        }

        let currentX = 50, currentY = 50;
        if (itinerary?.plan?.length > 0) {
            const nextItem = itinerary.plan[0];
            if (nextItem.type === 'ride') {
                const rideNode = ridesData.find(r => r.ride_id === nextItem.ride_id);
                if (rideNode) {
                    currentX = parseInt(rideNode.location_x, 10) || 50;
                    currentY = parseInt(rideNode.location_y, 10) || 50;
                }
            } else if (nextItem.location_x && nextItem.location_y) {
                currentX = nextItem.location_x; currentY = nextItem.location_y;
            }
        }

        // We generate a static fallback reply AND the raw data payload simultaneously
        let fallbackReply = "I'm not quite sure what you mean. Try asking me about the 'next ride', the 'shortest wait', or where to get 'food'!";
        let dataPayload = null;

        switch (intent) {
            case 'next_ride':
                if (itinerary?.plan?.length > 0) {
                    const next = itinerary.plan[0];
                    fallbackReply = `Your next stop is ${next.name}. The expected wait is about ${Math.round(next.expected_wait)} minutes.`;
                    dataPayload = next;
                } else {
                    fallbackReply = "You don't currently have an active itinerary.";
                }
                break;

            case 'least_crowded':
                if (waitTimesState?.rides) {
                    let minWait = Infinity; let fastestId = null;
                    for (const [id, data] of Object.entries(waitTimesState.rides)) {
                        if (data.wait_time < minWait) { minWait = data.wait_time; fastestId = id; }
                    }
                    const fastestRide = ridesData.find(r => r.ride_id === fastestId);
                    if (fastestRide) {
                        fallbackReply = `If you want to skip the lines, head to ${fastestRide.name}! The wait is currently only ${Math.round(minWait)} minutes.`;
                        dataPayload = { ...fastestRide, wait_time: minWait };
                    }
                }
                break;

            case 'best_ride':
                if (waitTimesState?.rides) {
                    let bestRide = null; let maxScore = -Infinity;
                    ridesData.forEach(ride => {
                        const waitTime = waitTimesState.rides[ride.ride_id]?.wait_time || 0;
                        const popularity = parseFloat(ride.popularity_score) || 0.5;
                        const score = popularity - (waitTime / 60); 
                        if (score > maxScore) { maxScore = score; bestRide = { ...ride, wait_time: waitTime }; }
                    });
                    if (bestRide) {
                        fallbackReply = `I highly recommend ${bestRide.name}! It's a fan favorite and the line is only ${Math.round(bestRide.wait_time)} mins right now.`;
                        dataPayload = bestRide;
                    }
                }
                break;

            case 'break_suggestion':
            case 'nearest_food':
                let nearestAmenity = null; let minDist = Infinity;
                const requiresFood = intent === 'nearest_food';

                for (const am of uniqueAmenities.values()) {
                    if (requiresFood && am.type !== 'food') continue;
                    const dist = getDistance(currentX, currentY, parseInt(am.location_x, 10) || 0, parseInt(am.location_y, 10) || 0);
                    if (dist < minDist) { minDist = dist; nearestAmenity = am; }
                }

                if (nearestAmenity) {
                    const wait = parseFloat(nearestAmenity.avg_wait_time_min) || 0;
                    fallbackReply = `You should head to ${nearestAmenity.name}. It's the closest to your current location with an expected line of ${wait} minutes.`;
                    dataPayload = nearestAmenity;
                }
                break;

            case 'remaining_plan':
                if (itinerary?.plan?.length > 0) {
                    const count = itinerary.plan.length;
                    const names = itinerary.plan.slice(0, 3).map(p => p.name).join(', ');
                    fallbackReply = `You have ${count} stops left. Coming up next: ${names}${count > 3 ? ', and more!' : '.'}`;
                    dataPayload = itinerary.plan;
                } else {
                    fallbackReply = "Your itinerary is currently empty. You are free to explore!";
                }
                break;

            case 'time_remaining':
                if (itinerary?.total_time) {
                    fallbackReply = `Your planned itinerary will take approximately ${itinerary.total_time} minutes to complete.`;
                    dataPayload = { total_time: itinerary.total_time };
                } else {
                    fallbackReply = "You don't have an active itinerary. Start planning to see time estimates!";
                }
                break;

            case 'skip_suggestion':
                if (waitTimesState?.rides) {
                    let maxWait = -Infinity; let worstId = null;
                    for (const [id, data] of Object.entries(waitTimesState.rides)) {
                        if (data.wait_time > maxWait) { maxWait = data.wait_time; worstId = id; }
                    }
                    const worstRide = ridesData.find(r => r.ride_id === worstId);
                    if (worstRide) {
                        fallbackReply = `I would suggest skipping ${worstRide.name} for now. The line is extremely long at ${Math.round(maxWait)} minutes!`;
                        dataPayload = { ...worstRide, wait_time: maxWait };
                    }
                }
                break;

            case 'crowd_status':
                if (waitTimesState?.rides) {
                    const waits = Object.values(waitTimesState.rides).map(r => r.wait_time);
                    if (waits.length > 0) {
                        const avg = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
                        let descriptor = avg > 45 ? "quite busy" : avg > 20 ? "moderately crowded" : "fairly quiet";
                        fallbackReply = `The park is ${descriptor} right now. The average wait time across all rides is ${avg} minutes.`;
                        dataPayload = { average_wait: avg, description: descriptor };
                    }
                }
                break;

            case 'progress_status':
                if (itinerary?.plan) {
                    fallbackReply = `You currently have ${itinerary.plan.length} items left on your checklist. Keep it up!`;
                    dataPayload = { remaining_count: itinerary.plan.length };
                } else {
                    fallbackReply = "I don't see an active plan right now.";
                }
                break;

            case 'recommendation_by_preference':
                if (waitTimesState?.rides) {
                    let targetIntensity = 3; 
                    if (msg.includes('thrill')) targetIntensity = 5;
                    else if (msg.includes('kid') || msg.includes('child')) targetIntensity = 1;

                    const matchingRides = ridesData.filter(r => {
                        const intensity = parseInt(r.intensity_level, 10) || 1;
                        return targetIntensity >= 4 ? intensity >= 4 : (targetIntensity <= 2 ? intensity <= 2 : intensity === 3);
                    });

                    if (matchingRides.length > 0) {
                        let bestMatch = matchingRides[0];
                        let minW = waitTimesState.rides[bestMatch.ride_id]?.wait_time || Infinity;
                        
                        matchingRides.forEach(r => {
                            const w = waitTimesState.rides[r.ride_id]?.wait_time || Infinity;
                            if (w < minW) { minW = w; bestMatch = r; }
                        });

                        const typeDesc = targetIntensity >= 4 ? "thrilling" : targetIntensity <= 2 ? "kid-friendly" : "moderate";
                        fallbackReply = `If you want a ${typeDesc} experience, you should try ${bestMatch.name}. The wait is only ${Math.round(minW)} minutes.`;
                        dataPayload = { ...bestMatch, wait_time: minW };
                    }
                }
                break;

            case 'plan_summary':
                if (itinerary?.plan?.length > 0) {
                    const ridesCount = itinerary.plan.filter(p => p.type === 'ride').length;
                    const breaksCount = itinerary.plan.filter(p => p.type !== 'ride').length;
                    fallbackReply = `Your itinerary has ${ridesCount} rides and ${breaksCount} breaks planned, taking an estimated ${itinerary.total_time} minutes total.`;
                    dataPayload = { rides: ridesCount, breaks: breaksCount, total_time: itinerary.total_time };
                } else {
                    fallbackReply = "You don't have a plan set up yet!";
                }
                break;
        }

        // ---------------------------------------------------------
        // STEP 3: Final Response using LLM (The Generator)
        // ---------------------------------------------------------
        const generationPrompt = `
            You are a highly enthusiastic, helpful AI assistant for the Aqua Imagicaa Water Park.
            The user asked a question, and the backend system has retrieved the factual data to answer it.
            
            User's original message: "${message}"
            Intent Identified: ${intent}
            Backend Data: ${JSON.stringify(dataPayload)}
            
            Rules:
            1. Write a natural, conversational response directly answering the user based ONLY on the Backend Data.
            2. Do NOT invent wait times, ride names, or locations.
            3. If the Backend Data is null or empty, politely apologize and state the data isn't currently available or they don't have an active itinerary.
            4. Keep the response concise (1-3 sentences maximum).
            5. Do NOT output JSON, just the plain text response.
        `;

        let finalReply = fallbackReply; // Default to our static rule-based string

        // Only ask the LLM to generate a response if we successfully identified a non-unknown intent
        if (intent !== 'unknown') {
            try {
                const generatedText = await callLLM(generationPrompt, message, false);
                if (generatedText) {
                    finalReply = generatedText;
                }
            } catch (llmError) {
                console.warn("LLM Generation failed. Falling back to static rule-based string.");
                // finalReply remains the fallbackReply generated in the switch statement
            }
        }

        // ---------------------------------------------------------
        // STEP 4: Return Final Payload
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