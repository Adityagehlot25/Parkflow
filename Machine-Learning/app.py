from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib
import os

# =====================================================================
# 1. App Initialization & Global State
# =====================================================================
app = FastAPI(
    title="Aqua Imagicaa ML Predictor",
    description="Microservice for predicting live water park wait times.",
    version="1.1.0"
)

# Global variables to hold our model and static data
model = None
ride_metadata = {}

# Define the expected JSON payload schema
class PredictionRequest(BaseModel):
    ride_id: str
    crowd_level: float
    time_of_day: int  # Expected as 24-hour format (e.g., 14 for 2:00 PM)

# =====================================================================
# 2. Startup Event: Load Model & CSV Metadata into RAM
# =====================================================================
@app.on_event("startup")
async def load_resources():
    global model, ride_metadata
    
    # --- 1. Load the ML Pipeline ---
    model_path = "waterpark_wait_time_model.pkl"
    if not os.path.exists(model_path):
        raise RuntimeError(f"Model file not found at {model_path}.")
    
    model = joblib.load(model_path)
    print("✅ ML Model loaded successfully.")
    
    # --- 2. Load the Ride Metadata CSV ---
    csv_path = "ride_metadata.csv"
    if not os.path.exists(csv_path):
        raise RuntimeError(f"Metadata CSV not found at {csv_path}.")
        
    df_meta = pd.read_csv(csv_path)
    
    # Map the exact columns from your CSV into a fast-lookup dictionary
    for _, row in df_meta.iterrows():
        # Handle cases where cycle_time_min might say 'Continuous' (e.g., Lazy River)
        cycle_time_val = row['cycle_time_min']
        if str(cycle_time_val).lower() == 'continuous':
            cycle_time_val = 5.0 # Safe fallback proxy for continuous rides
            
        # Handle '50+' strings in capacity
        cap_val = str(row['capacity_per_cycle']).replace('+', '')
        
        ride_metadata[row['ride_id']] = {
            'capacity_per_cycle': int(cap_val),
            'cycle_time': float(cycle_time_val),
            'popularity': float(row['popularity_score'])
        }
        
    print(f"✅ Loaded static metadata for {len(ride_metadata)} rides from CSV.")

# =====================================================================
# 3. Helper Functions
# =====================================================================
def map_time_of_day(hour: int) -> str:
    """Maps a 24-hour integer to the categorical string expected by the model."""
    if hour < 12:
        return 'morning'
    elif 12 <= hour < 17:
        return 'afternoon'
    else:
        return 'evening'

def map_day_type() -> str:
    """Infers 'weekday' vs 'weekend' based on the live server clock."""
    import datetime
    # 5 and 6 represent Saturday and Sunday
    is_weekend = datetime.datetime.now().weekday() >= 5 
    return 'weekend' if is_weekend else 'weekday'

# =====================================================================
# 4. API Endpoints
# =====================================================================
@app.get("/")
def health_check():
    return {"status": "ok", "message": "Aqua Imagicaa ML Service is running."}

@app.post("/predict")
def predict_wait_time(request: PredictionRequest):
    # 1. Validate Ride ID
    if request.ride_id not in ride_metadata:
        raise HTTPException(status_code=404, detail=f"Ride ID {request.ride_id} not found in metadata CSV.")
    
    # 2. Extract static metadata from RAM cache
    meta = ride_metadata[request.ride_id]
    
    # 3. Convert 0-1 crowd level to queue estimate (Max Queue = 300)
    estimated_queue = int(request.crowd_level * 300)
    
    # 4. Construct the feature dictionary expected by the Scikit-Learn Pipeline
    feature_dict = {
        'time_of_day': map_time_of_day(request.time_of_day),
        'day_type': map_day_type(),
        'people_in_queue': estimated_queue,
        'capacity_per_cycle': meta['capacity_per_cycle'],
        'cycle_time': meta['cycle_time'],
        'popularity': meta['popularity']
    }
    
    # Convert to a DataFrame (Pipelines require 2D structures)
    input_df = pd.DataFrame([feature_dict])
    
    try:
        # 5. Predict using the loaded pipeline
        prediction = model.predict(input_df)[0]
        
        # 6. Formatting and Guardrails
        predicted_wait = max(0.0, float(prediction))
        
        return {
            "ride_id": request.ride_id,
            "predicted_wait_time": round(predicted_wait, 2),
            "features_used": feature_dict 
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# =====================================================================
# 5. Local Execution Block
# =====================================================================
if __name__ == "__main__":
    import uvicorn
    # Runs on port 5001 so it doesn't conflict with your Node.js backend
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)