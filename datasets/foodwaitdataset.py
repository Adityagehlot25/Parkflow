import pandas as pd
import numpy as np

def create_amenities_metadata() -> pd.DataFrame:
    """
    Defines the specific metadata for the 6 amenities (Food, Rest Areas)
    distributed across your custom layout.
    """
    amenities = [
        {'amenity_id': 'F01', 'type': 'food', 'name': 'Food Court 1', 'location_x': 15, 'location_y': 50},
        {'amenity_id': 'F02', 'type': 'food', 'name': 'Food Court 2', 'location_x': 85, 'location_y': 50},
        {'amenity_id': 'F03', 'type': 'food', 'name': 'Food Court 3', 'location_x': 50, 'location_y': 85},
        {'amenity_id': 'R01', 'type': 'rest_area', 'name': 'Rest Area 1', 'location_x': 20, 'location_y': 80},
        {'amenity_id': 'R02', 'type': 'rest_area', 'name': 'Rest Area 2', 'location_x': 80, 'location_y': 20},
        {'amenity_id': 'R03', 'type': 'rest_area', 'name': 'Rest Area 3', 'location_x': 50, 'location_y': 50},
    ]
    return pd.DataFrame(amenities)

def get_rides_metadata() -> pd.DataFrame:
    """
    Returns the coordinates of the 15 rides to calculate spatial crowd influence.
    """
    rides = [
        {'ride_id': 'AQ01', 'location_x': 14, 'location_y': 85},
        {'ride_id': 'AQ02', 'location_x': 40, 'location_y': 60},
        {'ride_id': 'AQ03', 'location_x': 30, 'location_y': 55},
        {'ride_id': 'AQ04', 'location_x': 15, 'location_y': 80},
        {'ride_id': 'AQ05', 'location_x': 35, 'location_y': 50},
        {'ride_id': 'AQ06', 'location_x': 20, 'location_y': 85},
        {'ride_id': 'AQ07', 'location_x': 45, 'location_y': 65},
        {'ride_id': 'AQ08', 'location_x': 60, 'location_y': 40},
        {'ride_id': 'AQ09', 'location_x': 55, 'location_y': 45},
        {'ride_id': 'AQ10', 'location_x': 50, 'location_y': 50},
        {'ride_id': 'AQ11', 'location_x': 70, 'location_y': 30},
        {'ride_id': 'AQ12', 'location_x': 80, 'location_y': 20},
        {'ride_id': 'AQ13', 'location_x': 85, 'location_y': 45},
        {'ride_id': 'AQ14', 'location_x': 90, 'location_y': 40},
        {'ride_id': 'AQ15', 'location_x': 75, 'location_y': 50},
    ]
    return pd.DataFrame(rides)

def calculate_spatial_weights(df_amenities: pd.DataFrame, df_rides: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates an Inverse Distance Weighting (IDW) matrix.
    Rides closer to an amenity have a higher weight in determining its crowd level.
    """
    weight_matrix = pd.DataFrame(index=df_rides['ride_id'], columns=df_amenities['amenity_id'])
    
    for _, amenity in df_amenities.iterrows():
        a_id = amenity['amenity_id']
        ax, ay = amenity['location_x'], amenity['location_y']
        
        # Calculate Euclidean distance to all rides
        distances = np.sqrt((df_rides['location_x'] - ax)**2 + (df_rides['location_y'] - ay)**2)
        
        # Inverse distance (add 1 to prevent division by zero for identical coordinates)
        weights = 1.0 / (distances + 1.0)
        
        # Normalize weights so they sum to 1.0 for each amenity
        normalized_weights = weights / weights.sum()
        
        weight_matrix[a_id] = normalized_weights.values
        
    return weight_matrix

def generate_amenities_dataset(crowd_csv_path: str, output_csv_path: str = "smart_amenities_wait_times.csv"):
    """
    Main execution pipeline to generate the dynamic amenities wait time dataset.
    """
    np.random.seed(42)
    
    # 1. Load Data
    print("Loading crowd data...")
    df_crowd = pd.read_csv(crowd_csv_path) 
    df_amenities = create_amenities_metadata()
    df_rides = get_rides_metadata()
    
    # 2. Pivot crowd data to Matrix: Rows = Timestamps, Columns = Ride_IDs
    print("Computing spatial crowd dynamics...")
    crowd_matrix = df_crowd.pivot(index='timestamp', columns='ride_id', values='crowd_level')
    crowd_matrix = crowd_matrix.fillna(0)
    
    # 3. Create Distance Weights Matrix
    weight_matrix = calculate_spatial_weights(df_amenities, df_rides)
    
    # 4. Matrix Multiplication: Blends the local crowd density around the amenity
    local_crowd_matrix = crowd_matrix.dot(weight_matrix)
    
    # 5. Melt back into a flat format
    df_amenity_crowd = local_crowd_matrix.reset_index().melt(
        id_vars='timestamp', 
        var_name='amenity_id', 
        value_name='local_crowd_level'
    )
    
    # Merge with amenity metadata
    df_final = pd.merge(df_amenity_crowd, df_amenities, on='amenity_id')
    
    # 6. Apply Wait Time Logic
    print("Applying wait time logic...")
    N = len(df_final)
    crowd_factors = np.random.uniform(0.8, 1.2, size=N)
    
    is_food = df_final['type'] == 'food'
    is_rest_area = df_final['type'] == 'rest_area'
    
    food_base = np.random.uniform(5, 10, size=N)
    wait_times = np.zeros(N)
    
    # Food logic: wait = base + (factor * crowd * 10)
    wait_times[is_food] = food_base[is_food] + (crowd_factors[is_food] * df_final.loc[is_food, 'local_crowd_level'] * 10.0)
    
    # Rest areas remain 0.0, so no specific logic is needed beyond the initialization of wait_times = np.zeros(N)
    
    df_final['avg_wait_time_min'] = np.clip(wait_times, 0, None).round(1)
    
    # 7. Final Formatting
    cols = ['timestamp', 'amenity_id', 'type', 'name', 'location_x', 'location_y', 'avg_wait_time_min']
    df_final = df_final[cols].sort_values(['timestamp', 'amenity_id']).reset_index(drop=True)
    
    # Export
    df_final.to_csv(output_csv_path, index=False)
    print(f"Success! Saved {len(df_final)} rows to {output_csv_path}")
    
    return df_final


if __name__ == "__main__":
    # Run the amenities dataset generation using the crowd simulation CSV
    generate_amenities_dataset('waterpark_crowd_simulation.csv')