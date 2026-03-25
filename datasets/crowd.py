import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_waterpark_dataset(start_date: str = '2026-03-25') -> pd.DataFrame:
    """
    Generates a dynamic, minute-level crowd simulation dataset for Aqua Imagicaa.
    Returns a pandas DataFrame with >10,000 rows.
    """
    
    # 1. Define the Ride Metadata (Cleaned for numerical operations)
    rides_data = [
        {'ride_id': 'AQ01', 'name': 'Loopy Woopy', 'capacity': 1, 'cycle_time': 0.5, 'popularity': 0.95},
        {'ride_id': 'AQ02', 'name': 'Swirl Whirl', 'capacity': 4, 'cycle_time': 1.5, 'popularity': 0.88},
        {'ride_id': 'AQ03', 'name': 'Twisty Turvy', 'capacity': 2, 'cycle_time': 1.2, 'popularity': 0.85},
        {'ride_id': 'AQ04', 'name': 'Zip Zap Zoom', 'capacity': 2, 'cycle_time': 0.8, 'popularity': 0.80},
        {'ride_id': 'AQ05', 'name': 'Boomeranggo', 'capacity': 2, 'cycle_time': 1.0, 'popularity': 0.90},
        {'ride_id': 'AQ06', 'name': 'Yell-O!', 'capacity': 1, 'cycle_time': 0.6, 'popularity': 0.75},
        {'ride_id': 'AQ07', 'name': 'The Screamer', 'capacity': 3, 'cycle_time': 1.3, 'popularity': 0.82},
        {'ride_id': 'AQ08', 'name': 'Raftaastic!', 'capacity': 4, 'cycle_time': 2.0, 'popularity': 0.78},
        {'ride_id': 'AQ09', 'name': 'Soakerz', 'capacity': 4, 'cycle_time': 2.0, 'popularity': 0.70},
        {'ride_id': 'AQ10', 'name': 'Splash', 'capacity': 1, 'cycle_time': 0.7, 'popularity': 0.65},
        {'ride_id': 'AQ11', 'name': 'Floatsa', 'capacity': 50, 'cycle_time': 5.0, 'popularity': 0.60},
        {'ride_id': 'AQ12', 'name': 'Wacky Wavess', 'capacity': 200, 'cycle_time': 15.0, 'popularity': 0.92},
        {'ride_id': 'AQ13', 'name': 'Pirate Bay', 'capacity': 50, 'cycle_time': 5.0, 'popularity': 0.85},
        {'ride_id': 'AQ14', 'name': 'Kiddie Pond', 'capacity': 30, 'cycle_time': 5.0, 'popularity': 0.75},
        {'ride_id': 'AQ15', 'name': 'Rain Dance', 'capacity': 100, 'cycle_time': 20.0, 'popularity': 0.80},
    ]
    df_rides = pd.DataFrame(rides_data)

    # 2. Generate Time Series (12 hours of operation: 10:00 AM to 10:00 PM)
    # 12 hours * 60 minutes = 720 time steps. 720 * 15 rides = 10,800 rows.
    start_time = pd.to_datetime(f"{start_date} 10:00:00")
    end_time = pd.to_datetime(f"{start_date} 21:59:00")
    timestamps = pd.date_range(start=start_time, end=end_time, freq='1min')

    # Create a Cartesian product (Cross Join) of Timestamps and Rides
    df_time = pd.DataFrame({'timestamp': timestamps})
    
    # We use merge with a dummy key to perform the cross join efficiently
    df_time['dummy'] = 1
    df_rides['dummy'] = 1
    df = pd.merge(df_time, df_rides, on='dummy').drop('dummy', axis=1)

    # 3. Compute the Time-of-Day Multiplier
    # Extract hour and fractional hour (e.g., 10:30 -> 10.5)
    df['hour_float'] = df['timestamp'].dt.hour + (df['timestamp'].dt.minute / 60.0)

    # Map the hours to your defined multipliers (Interpolated for smooth transitions)
    # 10 AM (10) -> 0.4 | 1 PM (13) -> 1.1 | 5 PM (17) -> 0.75 | 10 PM (22) -> 0.1
    x_hours = [10, 11, 12, 13,   14,   15,  16,  17,   18,  19,  20,  21,  22]
    y_mults = [0.4, 0.7, 0.9, 1.15, 1.1, 0.95, 0.8, 0.75, 0.6, 0.4, 0.2, 0.1, 0.0]
    
    # Apply numpy interpolation for minute-by-minute smooth scaling
    df['time_multiplier'] = np.interp(df['hour_float'], x_hours, y_mults)

    # 4. Generate Core Simulation Metrics (Using numpy for performance and randomness)
    N = len(df)
    
    # --- CROWD LEVEL (0 to 1) ---
    # Formula: time_multiplier * popularity + random noise
    noise_crowd = np.random.normal(loc=0, scale=0.05, size=N)
    raw_crowd = (df['time_multiplier'] * df['popularity']) + noise_crowd
    df['crowd_level'] = np.clip(raw_crowd, 0, 1).round(3)

    # --- PEOPLE IN QUEUE ---
    # We define a 'base' queue size that scales reasonably with the ride's cycle efficiency.
    # Base formula: Base (100) * Time Multiplier * Popularity + Noise
    base_queue = 100 
    noise_queue = np.random.normal(loc=0, scale=8.0, size=N)
    raw_queue = (base_queue * df['time_multiplier'] * df['popularity']) + noise_queue
    df['people_in_queue'] = np.clip(np.round(raw_queue), 0, None).astype(int)

    # --- ACTIVE RIDERS ---
    # Active riders depend on the crowd level, but logically cannot exceed the ride's maximum capacity.
    # If the queue is high, active riders should be near/at capacity.
    noise_active = np.random.normal(loc=0, scale=2.0, size=N)
    raw_active = (df['crowd_level'] * df['capacity']) + noise_active
    
    # Clip between 0 and the actual capacity of that specific ride
    df['active_riders'] = np.clip(np.round(raw_active), 0, df['capacity']).astype(int)

    # 5. Final Cleanup
    # Select and order only the requested columns
    final_columns = [
        'timestamp', 
        'ride_id', 
        'people_in_queue', 
        'active_riders', 
        'crowd_level'
    ]
    df_final = df[final_columns].sort_values(by=['timestamp', 'ride_id']).reset_index(drop=True)

    return df_final

# Execute the generation
if __name__ == "__main__":
    np.random.seed(42) # Set seed for reproducibility
    simulated_data = generate_waterpark_dataset()
    
    # Display dataset info
    print(f"Dataset generated successfully with {len(simulated_data)} rows.")
    print("\nSample Data (Peak Time - 1:00 PM):")
    peak_sample = simulated_data[simulated_data['timestamp'] == '2026-03-25 13:00:00']
    print(peak_sample.head(5).to_string(index=False))
    
    # Save to CSV in this folder
    simulated_data.to_csv('waterpark_crowd_simulation.csv', index=False)