import pandas as pd
import numpy as np
import random
from datetime import timedelta

def generate_ride_metadata(num_rides=15):
    """
    Generates the static metadata for rides.
    Constraints: Popularity (0.5-1.5), Capacity (10-50), Cycle Time (2-6 mins)
    """
    rides_data = []
    for i in range(1, num_rides + 1):
        rides_data.append({
            'ride_id': f"AQ{i:02d}",
            'popularity': round(random.uniform(0.5, 1.5), 2),
            'capacity_per_cycle': random.randint(10, 50),
            'cycle_time': round(random.uniform(2.0, 6.0), 2)
        })
    return pd.DataFrame(rides_data)

def generate_timestamps(start_date='2026-04-01 10:00:00', num_days=30):
    """
    Generates minute-level timestamps. For performance and realistic ML modeling,
    we sample every 15 minutes between 10:00 AM and 10:00 PM over multiple days.
    """
    start_dt = pd.to_datetime(start_date)
    timestamps = []
    for day in range(num_days):
        current_date = start_dt + timedelta(days=day)
        # Operating hours: 10:00 AM to 9:45 PM
        for hour in range(10, 22):
            for minute in [0, 15, 30, 45]:
                timestamps.append(current_date.replace(hour=hour, minute=minute))
    return pd.DataFrame({'timestamp': timestamps})

def determine_time_attributes(df):
    """
    Categorizes the hour into Morning, Afternoon, or Evening.
    Categorizes the day of the week into Weekday or Weekend.
    """
    def categorize_time(hour):
        if hour < 12:
            return 'morning'
        elif 12 <= hour < 17:
            return 'afternoon'
        else:
            return 'evening'
            
    df['time_of_day'] = df['timestamp'].dt.hour.apply(categorize_time)
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_type'] = df['day_of_week'].apply(lambda x: 'weekend' if x >= 5 else 'weekday')
    return df

def build_ml_wait_time_dataset(file_name="waterpark_wait_time_dataset.csv"):
    """
    Core functional loop: Generates the synthetic dataframe and applies the crowd physics math.
    """
    # Set seeds for reproducibility
    np.random.seed(42)
    random.seed(42)
    
    # 1. Build Base Entities (Cross Join timestamps with rides)
    df_rides = generate_ride_metadata(15)
    df_time = generate_timestamps(num_days=30)
    
    df_time['key'] = 1
    df_rides['key'] = 1
    df = pd.merge(df_time, df_rides, on='key').drop('key', axis=1)
    
    # 2. Add Categorical Features
    df = determine_time_attributes(df)
    
    # 3. Apply Multipliers for Crowd Physics
    time_multipliers = {'morning': 0.4, 'afternoon': 1.2, 'evening': 0.7}
    df['time_multiplier'] = df['time_of_day'].map(time_multipliers)
    
    # Weekends increase base crowd by 30-50%
    weekend_mults = np.random.uniform(1.3, 1.5, size=len(df))
    df['day_multiplier'] = np.where(df['day_type'] == 'weekend', weekend_mults, 1.0)
    
    # 4. Calculate Queue Size
    # Formula: Base * time_mult * pop * day_mult + noise
    base_queue_factor = 80
    noise_queue = np.random.normal(loc=0, scale=10.0, size=len(df))
    raw_queue = (base_queue_factor * df['time_multiplier'] * df['popularity'] * df['day_multiplier']) + noise_queue
    df['people_in_queue'] = np.clip(np.round(raw_queue), 0, None).astype(int) # Prevents negative queues
    
    # 5. Calculate Actual Wait Time
    # Formula: wait_time = (people_in_queue / capacity_per_cycle) * cycle_time + noise
    wait_noise = np.random.uniform(-2, 3, size=len(df))
    raw_wait_time = (df['people_in_queue'] / df['capacity_per_cycle']) * df['cycle_time'] + wait_noise
    df['actual_wait_time'] = np.clip(raw_wait_time, 0, None).round(2)
    
    # 6. Format Output
    final_cols = [
        'timestamp', 'ride_id', 'time_of_day', 'day_type', 
        'people_in_queue', 'capacity_per_cycle', 'cycle_time', 
        'popularity', 'actual_wait_time'
    ]
    df = df[final_cols].sort_values(['timestamp', 'ride_id']).reset_index(drop=True)
    
    # Save to CSV
    df.to_csv(file_name, index=False)
    print(f"Successfully generated {len(df)} rows and saved to {file_name}")
    return df

# Execute the simulation
if __name__ == "__main__":
    ml_dataset = build_ml_wait_time_dataset()
    print("\nSample Output:")
    print(ml_dataset.head())