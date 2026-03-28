# 📡 API Documentation

Complete reference for all Aqua Imagicaa Backend endpoints.

**Base URL**: `http://localhost:5000`

---

## Rides & Layout

### GET /rides

Returns all rides with their metadata and coordinates.

**Response**: 
```json
{
  "data": [
    {
      "ride_id": "AQ01",
      "name": "Loopy Woopy",
      "category": "Thrill",
      "zone": "thrill",
      "x_coordinate": 43,
      "y_coordinate": 83,
      "capacity_per_cycle": 1,
      "cycle_time_min": 0.5,
      "popularity_score": 0.95,
      "min_age": "12+",
      "intensity_level": 5
    }
  ]
}
```

**Status Codes**:
- `200` - Success
- `500` - Dataset loading error

---

## Live Crowd Data

### GET /crowd

Returns real-time crowd levels and queue information for all rides.

**Response**:
```json
{
  "data": [
    {
      "ride_id": "AQ01",
      "people_in_queue": 33,
      "active_riders": 1,
      "crowd_level": 0.405,
      "timestamp": "2026-03-28T10:00:00Z"
    }
  ],
  "timestamp": "2026-03-28T10:00:00Z"
}
```

**Crowd Level Scale**:
- `0.0 - 0.3` = Low (Green) ✓
- `0.3 - 0.7` = Medium (Yellow) ⚠️
- `0.7 - 1.0` = High (Red) 🔴

**Updates**: Every 5 seconds (or custom interval)

---

## Wait Times

### GET /wait-times

Returns predicted wait times for all rides based on live crowd and ML models.

**Response**:
```json
{
  "data": {
    "AQ01": {
      "wait_time": 17.24,
      "popularity": 0.95,
      "crowd_level": 0.405,
      "calculation_method": "ml_model"
    },
    "AQ02": {
      "wait_time": 5.79,
      "popularity": 0.88,
      "crowd_level": 0.345,
      "calculation_method": "ml_model"
    }
  },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

**Calculation Methods**:
- `ml_model` - Scikit-learn prediction based on historical data
- `crowd_based` - Calculated from current crowd level
- `capacity_based` - Based on ride capacity and queue

---

## Itinerary Planning

### POST /itinerary/plan-itinerary

Generates an optimized visit plan based on user preferences.

**Request**:
```json
{
  "group_size": 4,
  "age_group": "mixed",
  "thrill_preference": 0.5,
  "visit_duration_hours": 4
}
```

**Parameters**:
| Field | Type | Description |
|-------|------|-------------|
| `group_size` | number | Group size (1-50) |
| `age_group` | string | `"kids"`, `"mixed"`, or `"adults"` |
| `thrill_preference` | number | 0 (chill) to 1 (thrill) |
| `visit_duration_hours` | number | Hours at park (1-12) |

**Response**:
```json
{
  "plan": [
    {
      "type": "ride",
      "ride_id": "AQ13",
      "name": "Pirate Bay",
      "expected_wait": 3.95,
      "order": 1
    },
    {
      "type": "food",
      "name": "Food Court 1",
      "expected_wait": 11.1,
      "location_x": 15,
      "location_y": 50,
      "order": 2
    },
    {
      "type": "ride",
      "ride_id": "AQ14",
      "name": "Kiddie Pond",
      "expected_wait": 1.41,
      "order": 3
    }
  ]
}
```

**Status Codes**:
- `200` - Plan generated successfully
- `400` - Invalid input parameters
- `503` - Wait times service initializing

---

## Amenities

### GET /amenities

Returns all food courts and rest areas with locations and details.

**Response**:
```json
{
  "data": [
    {
      "amenity_id": "F01",
      "type": "food",
      "name": "Food Court 1",
      "location_x": 15,
      "location_y": 50,
      "avg_wait_time": 11.1
    },
    {
      "amenity_id": "R01",
      "type": "rest_area",
      "name": "Rest Area 1",
      "location_x": 10,
      "location_y": 60,
      "avg_wait_time": 0.0
    }
  ]
}
```

**Amenity Types**:
- `food` - Food courts/restaurants
- `rest_area` - Seating and rest areas

---

## Chat Assistant

### POST /chat

AI-powered chat with context awareness about current park state.

**Request**:
```json
{
  "message": "What rides should I visit next for my 4-year-old?",
  "itinerary": null
}
```

**Response**:
```json
{
  "response": "I recommend starting with Pirate Bay (for kids) and Kiddie Pond. Both are low-intensity and perfect for your age group. Current wait times are reasonable...",
  "context": {
    "lowest_wait": "AQ06 (Yell-O!) - 0 min",
    "most_crowded": "AQ12 (Wacky Wavess) - 41 people",
    "recommendations": ["AQ13", "AQ14", "AQ15"]
  }
}
```

**Status Codes**:
- `200` - Response generated
- `400` - Invalid input
- `503` - LLM service unavailable

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Description of what went wrong"
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Datasets not loaded" | Data files missing or corrupted | Check `datasets/` folder |
| "Wait times service initializing" | Server just started | Wait 10 seconds and retry |
| "LLM API Key is missing" | OPENROUTER_API_KEY not set | Add to `.env` file |
| "OpenRouter API Error: ..." | API request failed | Check API key validity |

---

## Rate Limiting

Currently **no rate limiting** implemented. In production, add:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per windowMs
});

app.use(limiter);
```

---

## CORS Configuration

The API accepts requests from:
- `http://localhost:5173` (local frontend)
- Any origin (can be restricted in production)

---

## Response Headers

All successful responses include:

```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## Testing with cURL

### Test Rides Endpoint
```bash
curl http://localhost:5000/rides
```

### Test Crowd Data
```bash
curl http://localhost:5000/crowd
```

### Test Itinerary Generation
```bash
curl -X POST http://localhost:5000/itinerary/plan-itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "group_size": 4,
    "age_group": "mixed",
    "thrill_preference": 0.5,
    "visit_duration_hours": 4
  }'
```

### Test Chat
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What rides are best for families?"}'
```

---

## API Versioning

Current version: **v1** (no version prefix in URLs)

Future versions will use: `/v2/rides`, `/v2/crowd`, etc.

---

## Performance Tips

1. **Batch Requests**: Get all data in one request when possible
2. **Polling Interval**: Frontend polls crowd every 5s (balance between updates and load)
3. **Caching**: Consider caching ride metadata (changes rarely)
4. **Wait Times**: Predictions update with crowd simulator (synced)

---

## WebSocket Support (Future)

For real-time updates without polling:

```javascript
// Coming in v2
socket.on('crowd-update', (data) => {
  // Live crowd data pushed from server
});
```

---

**Last Updated**: March 28, 2026
