# 🏗️ Architecture & Development Guide

Deep dive into the system architecture and how to extend it.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                         │
│  (ParkMap, RideCards, ItineraryForm, ChatBox)           │
│              http://localhost:5173                       │
└─────────────┬───────────────────────────────────────────┘
              │ HTTP/REST
              ↓
┌─────────────────────────────────────────────────────────┐
│          Express.js Backend (Node.js)                    │
│              http://localhost:5000                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ API Routes                                      │    │
│  │  - /rides          → Rides metadata            │    │
│  │  - /crowd          → Live crowd data           │    │
│  │  - /wait-times     → Wait predictions          │    │
│  │  - /itinerary      → Plan generation           │    │
│  │  - /amenities      → Amenity locations         │    │
│  │  - /chat           → AI assistant              │    │
│  └─────────────────────────────────────────────────┘    │
│                    ↓                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Services                                        │    │
│  │  - dataLoader      → CSV file loading           │    │
│  │  - crowdSimulator  → Real-time simulation       │    │
│  │  - waitTimeService → ML predictions + cache     │    │
│  └─────────────────────────────────────────────────┘    │
│                    ↓                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Data Sources                                    │    │
│  │  - CSV Datasets    → Historical data            │    │
│  │  - OpenRouter API  → LLM for chat               │    │
│  │  - Simulators      → Real-time state            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
              ↑
              │ Optional
              ↓
┌─────────────────────────────────────────────────────────┐
│       Python ML Module (Scikit-learn)                    │
│         Wait Time Prediction Models                      │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Request Flow: Getting Park Map

```
1. Frontend mounts ParkMap component
   └→ useEffect: fetch /rides
   
2. Backend /rides endpoint
   └→ Load ride_metadata.csv + waterpark_layout.csv
   └→ Merge datasets
   └→ Return combined data
   
3. Frontend receives data
   └→ State: setLayout(data.data)
   └→ Component renders ride nodes on map
   └→ Fetch /crowd for live stats
```

### Request Flow: Planning Itinerary

```
1. User submits ItineraryForm
   └→ POST /itinerary/plan-itinerary with preferences
   
2. Backend Itinerary Route
   └→ Load ride_metadata.csv + layout
   └→ Get wait times (ML predictions)
   └→ Filter by age group & thrill
   └→ Run greedy algorithm
   └→ Insert amenities at 2-hour breaks
   └→ Return optimized plan
   
3. Frontend receives plan
   └→ State: setItinerary(data)
   └→ ParkMap highlights itinerary rides
   └→ Draw SVG lines connecting nodes
```

---

## File Structure & Responsibilities

### Backend Services

#### `dataLoader.js`
```javascript
async function loadCSV(filename)
  └→ Reads from CSV files in datasets/
  └→ Returns parsed array of objects
  └→ Handles errors gracefully
```

**Used by**: All routes that need data

#### `crowdSimulator.js`
```javascript
async function initCrowdSimulator(calculateWaitTimes)
  └→ Creates real-time crowd state
  └→ Updates every simulation tick
  └→ Triggers wait time recalculations
  
// State maintained:
crowdData = {
  "ride_id": {
    people_in_queue: number,
    active_riders: number,
    crowd_level: 0-1
  }
}
```

**Updates**: Continuous (every 50-100ms)

#### `waitTimeService.js`
```javascript
async function initWaitTimeService()
  └→ Loads ML model
  └→ Caches predictions
  └→ Updates with crowd changes

async function calculateWaitTimes()
  └→ Called by crowd simulator
  └→ Input: current crowd data
  └→ Output: predicted wait times
```

**Model**: Scikit-learn trained on historical data

---

## Backend Routes

### `routes/rides.js`

Merges ride metadata with layout coordinates.

```javascript
GET /rides
├─ Load: ride_metadata.csv
├─ Load: waterpark_layout.csv
├─ Merge on: ride_id
└─ Return: Combined dataset
```

**Data Conflicts Handled**: 
- Duplicate rides are filtered
- Null values are skipped
- Coordinates standardized to percentages (0-100)

### `routes/crowd.js`

Returns current crowd simulator state.

```javascript
GET /crowd
├─ Read: crowdData from memory
├─ Add: Timestamp
└─ Return: Current state
```

**Update Frequency**: Real-time (synced with simulator)

### `routes/waitTimes.js`

Returns ML-predicted wait times.

```javascript
GET /wait-times
├─ Read: Cached predictions
├─ Add: Metadata (popularity, method)
└─ Return: Wait time estimates
```

**Cache**: Updated every simulator tick

### `routes/itinerary.js`

Core algorithm for plan generation.

```javascript
POST /itinerary/plan-itinerary
│
├─ Input Validation
│  └─ age_group: "kids"|"mixed"|"adults"
│  └─ thrill_preference: 0-1
│  └─ visit_duration_hours: 1-12
│
├─ Load Data
│  ├─ Ride metadata with wait times
│  └─ Amenities (food, rest areas)
│
├─ Filter Rides
│  └─ Age group constraints
│  └─ Remove visited rides
│
├─ Score Calculation
│  └─ Match = 1 - |thrill_pref - normalized_intensity|
│  └─ Wait Penalty = wait_time / 60
│  └─ Distance = euclidean distance / 100
│  └─ Score = Match - Wait - Distance
│
├─ Greedy Selection
│  └─ Pick highest score
│  └─ Add to plan
│  └─ Mark as visited
│
├─ Amenity Insertion
│  ├─ Every 120 mins: insert food break
│  ├─ If no food: insert rest area
│  └─ Calculate travel time
│
├─ Duration Check
│  └─ Current time + ride time <= duration
│  └─ Stop when time exhausted
│
└─ Return: Optimized plan
```

**Algorithm Complexity**: O(n²) where n = number of rides

### `routes/chat.js`

AI chat with context awareness.

```javascript
POST /chat
│
├─ LLM System Prompt
│  └─ Include: Park state, rides, wait times
│
├─ User Message
│  └─ Add: User context (age, preferences)
│  └─ Add: Current itinerary (if exists)
│
├─ Call OpenRouter API
│  └─ Model: openai/gpt-4o-mini
│  └─ Temperature: 0.3 (consistent)
│  └─ JSON Mode: Optional
│
├─ Parse Response
│  └─ Extract: Text response
│  └─ Extract: Recommendations
│
└─ Return: Response + context
```

---

## Frontend Components

### `ParkMap.jsx`
- Displays 2D park layout
- Shows ride positions with live crowd colors
- Draws SVG lines for itinerary path
- Polls `/crowd` every 5 seconds

**State Management**:
```javascript
layout          // Ride positions
crowdData       // Live crowd levels
itinerary       // Current plan
loading/error   // UI states
```

### `RideCards.jsx`
- Lists all rides with stats
- Shows wait times
- Displays crowd levels
- Clickable cards for details

**Real-time Updates**: Fetches `/rides` + `/wait-times`

### `ItineraryForm.jsx`
- User preference input
- Group size, age group, thrill level
- Visit duration slider
- Submits to `/itinerary/plan-itinerary`

**Form Constraints**:
```
group_size: 1-50
thrill_preference: 0-1 (slider)
visit_duration: 1-12 hours
age_group: fixed options
```

### `ChatBox.jsx`
- Floating AI chat interface
- Sends user messages to `/chat`
- Displays AI responses
- Context-aware suggestions

---

## Data Models

### Ride Model
```typescript
{
  ride_id: string,           // AQ01, AQ02, etc.
  name: string,              // Display name
  category: string,          // Thrill, Family, Chill, Kids
  intensity_level: number,   // 1-5 scale
  zone: string,              // thrill, family, chill, kids, food, rest
  x_coordinate: number,      // 0-100 (percent)
  y_coordinate: number,      // 0-100 (percent)
  capacity_per_cycle: number,
  cycle_time_min: number,
  popularity_score: number,  // 0-1
  min_age: string
}
```

### Crowd Data Model
```typescript
{
  ride_id: string,
  people_in_queue: number,
  active_riders: number,
  crowd_level: number,       // 0-1 scale
  timestamp: ISO8601 string
}
```

### Wait Time Model
```typescript
{
  wait_time: number,         // minutes
  popularity: number,        // 0-1
  crowd_level: number,       // 0-1
  calculation_method: string // "ml_model" | "crowd_based"
}
```

### Plan Step Model
```typescript
{
  type: "ride" | "food" | "rest_area",
  ride_id?: string,
  name: string,
  order: number,
  expected_wait: number,     // minutes
  location_x?: number,
  location_y?: number
}
```

---

## Performance Considerations

### Backend

| Operation | Time | Notes |
|-----------|------|-------|
| CSV Load | ~50ms | Cached after first load |
| Ride Merge | ~5ms | In-memory operation |
| Itinerary Gen | ~100ms | O(n²) greedy search |
| ML Prediction | ~50ms | Cached predictions |
| API Latency | ~5-10ms | Network + serialization |

### Frontend

| Operation | Time | Notes |
|-----------|------|-------|
| Map Render | ~20ms | React Virtual DOM |
| SVG Path Draw | ~30ms | Canvas optimization |
| Crowd Poll | Every 5s | Configurable interval |
| Chat Response | ~2s | Includes LLM latency |

### Optimization Tips

1. **Increase CSV Cache TTL**: Rides metadata doesn't change
2. **Memoize Calculations**: Use `useMemo` in React components
3. **Lazy Load**: Load amenities only when needed
4. **Batch Updates**: Group state updates to reduce re-renders
5. **Debounce Polls**: Reduce crowd update frequency if needed

---

## Adding New Features

### Add a New Route

1. Create `backend/routes/newFeature.js`:
```javascript
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Your logic here
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

2. Register in `server.js`:
```javascript
const newRouter = require('./routes/newFeature');
app.use('/new-feature', newRouter);
```

3. Update frontend API calls with new endpoint

### Add ML Model

1. Train model in `Machine-Learning/`:
```python
# Train your model
model = train_model(data)
joblib.dump(model, 'your_model.pkl')
```

2. Load in `waitTimeService.js`:
```javascript
const { spawn } = require('child_process');
const predictions = await callPythonModel(data);
```

---

## Testing

### Test Backend Endpoints
```bash
# In backend directory
npm test

# Or use curl:
curl http://localhost:5000/rides
curl -X POST http://localhost:5000/itinerary/plan-itinerary -d '{...}'
```

### Test Frontend
```bash
# In waterpark-frontend directory
npm run lint
npm run build
```

---

## Debugging

### Enable Verbose Logging

In `server.js`:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Browser DevTools
- Network tab: Check API responses
- React DevTools: Inspect component state
- Console: Check for errors

---

## Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] User accounts & saved itineraries
- [ ] Mobile-responsive design
- [ ] Multi-language support
- [ ] VR/AR park visualization
- [ ] Social sharing of itineraries
- [ ] Dynamic pricing based on crowd
- [ ] Ride status (maintenance, closed)

---

**Last Updated**: March 28, 2026
