# 🌊 Aqua Imagicaa - Live Water Park Dashboard

A full-stack real-time water park management system with AI-powered itinerary planning and live crowd monitoring.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Data Models](#data-models)

---

## ✨ Features

### Real-Time Monitoring
- **Live Crowd Levels**: Real-time crowd density tracking for each ride (0-100% scale)
- **Queue Status**: Active queue depths and current rider counts
- **Wait Times**: Predicted wait times based on ML models and current crowd levels
- **Live Map**: Interactive 2D park layout showing ride positions and crowd status

### Intelligent Itinerary Planning
- **Smart Route Optimization**: Greedy algorithm with amenity insertion for optimal visit routes
- **Preference Matching**: Filters rides by age group, thrill preference, and popularity
- **Break Scheduling**: Automatic food court and rest area insertion based on visit duration
- **Time Estimation**: Accurate wait time and travel time calculations

### AI Chat Assistant
- **OpenRouter API Integration**: Powered by GPT-4o-mini via OpenRouter
- **Context-Aware Responses**: Understands current park state and itinerary
- **Real-Time Updates**: Access to live crowd data and wait times
- **Personalized Recommendations**: Suggests rides based on user preferences

### Wait Time Prediction
- **ML-Based Forecasting**: Scikit-learn models trained on historical data
- **Dynamic Updates**: Recalculated every simulation cycle
- **Time-of-Day Factors**: Adjustments based on peak/off-peak hours
- **Popularity Integration**: Incorporates ride popularity scores

---

## 🛠 Tech Stack

### Frontend
- **React 19.2.4** - UI components
- **Vite 8.0.1** - Build tool & dev server
- **CSS-in-JS** - Inline styling with responsive design
- **Node.js Fetch API** - HTTP requests

### Backend
- **Express.js 5.2.1** - REST API framework
- **CORS** - Cross-origin request handling
- **dotenv** - Environment variable management
- **CSV Parser** - Dataset loading

### Machine Learning
- **Python 3.x**
- **Scikit-learn** - ML models for wait time prediction
- **Pandas** - Data manipulation
- **NumPy** - Numerical computing
- **Joblib** - Model persistence

### External APIs
- **OpenRouter** - LLM API (GPT-4o-mini)

---

## 📁 Project Structure

```
Water park/
├── backend/                          # Node.js Express server
│   ├── datasets/
│   │   ├── ride_metadata.csv        # Ride details (capacity, intensity, etc.)
│   │   ├── waterpark_layout.csv     # Ride coordinates and zones
│   │   ├── smart_amenities_wait_times.csv  # Amenity time-series data
│   │   ├── waterpark_crowd_simulation.csv  # Simulation data
│   │   └── waterpark_wait_time_dataset.csv # Training data
│   ├── routes/
│   │   ├── rides.js                 # Merge ride metadata with layout
│   │   ├── crowd.js                 # Live crowd simulation
│   │   ├── waitTimes.js             # Wait time calculations
│   │   ├── itinerary.js             # Itinerary planning logic
│   │   ├── amenities.js             # Amenity endpoints
│   │   └── chat.js                  # AI chat endpoint
│   ├── services/
│   │   ├── dataLoader.js            # CSV loading utilities
│   │   ├── crowdSimulator.js        # Real-time crowd simulation
│   │   └── waitTimeService.js       # Wait time predictions
│   ├── server.js                    # Express app setup
│   ├── package.json                 # Node dependencies
│   ├── .env                         # API keys (gitignored)
│   └── .env.example                 # Template for env variables
│
├── Machine-Learning/                # Python ML module
│   ├── app.py                       # Flask app (optional)
│   ├── waitTime_model.py            # Wait time ML model
│   ├── ride_metadata.csv            # Ride reference data
│   ├── waterpark_wait_time_dataset.csv  # Training dataset
│   ├── requirements.txt             # Python dependencies
│   └── __pycache__/                 # Python cache
│
├── waterpark-frontend/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParkMap.jsx          # Interactive park map
│   │   │   ├── RideCards.jsx        # Ride list display
│   │   │   ├── ItineraryForm.jsx    # Itinerary planner
│   │   │   └── ChatBox.jsx          # AI chat interface
│   │   ├── App.jsx                  # Main app component
│   │   ├── App.css                  # Global styles
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Base styles
│   ├── package.json                 # React dependencies
│   ├── vite.config.js               # Vite configuration
│   └── index.html                   # HTML entry point
│
├── README.md                        # This file
├── requirements.txt                 # Root Python deps (if any)
└── .gitignore                       # Git ignore rules
```

---

## 📋 Prerequisites

- **Node.js** 16+ (for backend and frontend)
- **Python** 3.8+ (for ML module)
- **npm** or **yarn** (for package management)
- **OpenRouter API Key** (for AI chat features)

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
cd Water\ park
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd ../waterpark-frontend
npm install
```

### 4. Python ML Setup

```bash
cd ../Machine-Learning
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Root Environment Setup (if needed)

```bash
cd ..
pip install -r requirements.txt
```

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=5000
YOUR_SITE_URL=http://localhost:5000
```

**Getting an OpenRouter API Key:**
1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up and create an account
3. Go to API Keys section
4. Create a new API key
5. Copy it to your `.env` file

### Frontend API Configuration

The frontend is configured to use `http://localhost:5000` by default. To change this, edit the `API_BASE_URL` in component files:

```javascript
const API_BASE_URL = 'http://localhost:5000';
```

---

## ▶️ Running the Application

### Terminal 1: Backend Server

```bash
cd backend
node server.js
```

Expected output:
```
🌊 Water Park Backend is live on http://localhost:5000
- Layout Data:     http://localhost:5000/rides
- Live Crowd Data: http://localhost:5000/crowd
- Live Wait Times: http://localhost:5000/wait-times
- Itinerary Planner: http://localhost:5000/itinerary
- Amenities Data:  http://localhost:5000/amenities
```

### Terminal 2: Frontend Development Server

```bash
cd waterpark-frontend
npm run dev
```

Expected output:
```
VITE v8.0.1  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Terminal 3: Machine Learning Model (Optional)

```bash
cd Machine-Learning
python app.py
```

---

## 📡 API Endpoints

### Rides & Layout

**GET** `/rides`
- Returns all rides with coordinates and metadata
- Response: `{ data: [{ ride_id, name, x_coordinate, y_coordinate, ... }] }`

### Live Crowd Data

**GET** `/crowd`
- Returns current crowd levels and queue sizes
- Response: `{ data: [{ ride_id, crowd_level, people_in_queue }] }`

### Wait Times

**GET** `/wait-times`
- Returns predicted wait times for all rides
- Response: `{ data: { ride_id: { wait_time, timestamp } } }`

### Itinerary Planning

**POST** `/itinerary/plan-itinerary`
- Plans an optimized visit itinerary
- Request:
  ```json
  {
    "group_size": 4,
    "age_group": "mixed",
    "thrill_preference": 0.5,
    "visit_duration_hours": 4
  }
  ```
- Response: `{ plan: [{ type, ride_id, name, order, expected_wait }] }`

### Amenities

**GET** `/amenities`
- Returns food courts and rest areas
- Response: `{ data: [{ amenity_id, type, name, location_x, location_y }] }`

### Chat Assistant

**POST** `/chat`
- AI-powered recommendations based on current park state
- Request: `{ message: "What rides should I visit next?" }`
- Response: `{ response: "AI-generated response", context: {...} }`

---

## 🏗 Architecture

### Data Flow

```
Frontend (React)
    ↓
Express Backend
    ├── CSV Data Loader
    ├── Crowd Simulator (updates every tick)
    ├── Wait Time Service (ML predictions)
    ├── Itinerary Planner (greedy + amenities)
    └── OpenRouter API (Chat Assistant)
    ↓
Machine Learning (Python)
    └── Wait Time Model
```

### Real-Time Updates

- **Crowd Simulator**: Runs continuously, updating every tick
- **Wait Times**: Recalculated based on live crowd levels
- **Frontend Polling**: ParkMap refreshes crowd data every 5 seconds

### Itinerary Algorithm

1. **Filter Rides** by age group and thrill preference
2. **Greedy Selection** based on score:
   - Preference match (thrill level alignment)
   - Wait penalty (minimize queue times)
   - Distance penalty (minimize travel)
3. **Amenity Insertion** after every 2 hours of rides
4. **Duration Constraint** ensures plan fits within visit time

---

## 📊 Data Models

### Ride Object

```javascript
{
  ride_id: "AQ01",
  name: "Loopy Woopy",
  category: "Thrill",
  x_coordinate: 43,
  y_coordinate: 83,
  capacity_per_cycle: 11,
  cycle_time_min: 4.97,
  intensity_level: 5,
  popularity_score: 0.95
}
```

### Amenity Object

```javascript
{
  amenity_id: "F01",
  type: "food",
  name: "Food Court 1",
  location_x: 15,
  location_y: 50,
  avg_wait_time: 11.1
}
```

### Itinerary Plan Object

```javascript
{
  plan: [
    {
      type: "ride",
      ride_id: "AQ01",
      name: "Loopy Woopy",
      expected_wait: 17.24,
      order: 1
    },
    {
      type: "food",
      name: "Food Court 1",
      expected_wait: 11.1,
      order: 2
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Backend Won't Start

```
Error: EADDRINUSE: address already in use :::5000
```
**Solution**: Change PORT in .env or kill process on port 5000

### Frontend Can't Connect to Backend

```
Failed to fetch http://localhost:5000/rides
```
**Check**:
1. Backend is running on port 5000
2. CORS is enabled (it is by default)
3. API URL in component matches your backend URL

### Missing API Key

```
Error: LLM API Key is missing
```
**Solution**: Add OPENROUTER_API_KEY to `backend/.env`

---

## 📦 Deployment

### Build Frontend
```bash
cd waterpark-frontend
npm run build
```

### Deploy Backend
```bash
cd backend
npm install --production
node server.js
```

---

## 📝 License

MIT License - Feel free to use this project for educational purposes.

---

## 👥 Contributors

- Full-stack development
- Real-time simulation
- AI integration
- Data visualization

---

**Last Updated**: March 28, 2026
