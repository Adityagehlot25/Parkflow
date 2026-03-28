const express = require('express');
const router = express.Router();
const { loadCSV } = require('../services/dataLoader');

// GET /amenities
router.get('/', async (req, res) => {
    try {
        // 1. Load the amenities dataset
        const amenitiesData = await loadCSV('smart_amenities_wait_times.csv');

        // 2. Failsafe if the dataset is missing or empty
        if (!amenitiesData || amenitiesData.length === 0) {
            return res.status(404).json({ message: "No amenities data available." });
        }

        // 3. Map and format the data
        const result = amenitiesData.map(amenity => ({
            amenity_id: amenity.amenity_id,
            type: amenity.type,
            name: amenity.name,
            location_x: parseInt(amenity.location_x, 10) || 0,
           location_y: parseInt(amenity.location_y, 10) || 0,
            avg_wait_time: parseFloat(amenity.avg_wait_time_min) || 0.0 
        }));

        // 4. Return the structured response
        res.json({
            data: result
        });

    } catch (error) {
        console.error("Error loading amenities data:", error);
        res.status(500).json({ error: "Failed to retrieve amenities data." });
    }
});

module.exports = router;