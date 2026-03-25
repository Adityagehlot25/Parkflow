import pandas as pd
import numpy as np

def generate_water_park_layout(file_name="waterpark_layout.csv"):
    """
    Generates a 2D coordinate-based layout for a water park visualization.
    Coordinates are on a 100x100 grid.
    Ensures logical grouping by zone without excessive overlapping.
    """
    
    # 1. Base ride data including categories
    rides_data = [
        {'ride_id': 'AQ01', 'name': 'Loopy Woopy', 'category': 'thrill'},
        {'ride_id': 'AQ02', 'name': 'Swirl Whirl', 'category': 'thrill'},
        {'ride_id': 'AQ03', 'name': 'Twisty Turvy', 'category': 'thrill'},
        {'ride_id': 'AQ04', 'name': 'Zip Zap Zoom', 'category': 'thrill'},
        {'ride_id': 'AQ05', 'name': 'Boomeranggo', 'category': 'thrill'},
        {'ride_id': 'AQ06', 'name': 'Yell-O!', 'category': 'thrill'},
        {'ride_id': 'AQ07', 'name': 'The Screamer', 'category': 'thrill'},
        {'ride_id': 'AQ08', 'name': 'Raftaastic!', 'category': 'family'},
        {'ride_id': 'AQ09', 'name': 'Soakerz', 'category': 'family'},
        {'ride_id': 'AQ10', 'name': 'Splash', 'category': 'family'},
        {'ride_id': 'AQ11', 'name': 'Floatsa', 'category': 'chill'},
        {'ride_id': 'AQ12', 'name': 'Wacky Wavess', 'category': 'chill'},
        {'ride_id': 'AQ13', 'name': 'Pirate Bay', 'category': 'kids'},
        {'ride_id': 'AQ14', 'name': 'Kiddie Pond', 'category': 'kids'},
        {'ride_id': 'AQ15', 'name': 'Rain Dance', 'category': 'chill'}
    ]
    df_rides = pd.DataFrame(rides_data)
    
    # 2. Collision Detection Helper
    # Keeps track of assigned coordinates to ensure padding between rides
    used_coords = set()
    
    def get_coords(x_min, x_max, y_min, y_max, padding=5):
        """Generates random coordinates within bounds, ensuring a minimum distance from others."""
        max_attempts = 100
        for _ in range(max_attempts):
            x = np.random.randint(x_min, x_max)
            y = np.random.randint(y_min, y_max)
            
            # Check overlap using Pythagorean distance
            overlap = False
            for ux, uy in used_coords:
                dist = np.sqrt((x - ux)**2 + (y - uy)**2)
                if dist < padding:
                    overlap = True
                    break
            
            if not overlap:
                used_coords.add((x, y))
                return x, y
        
        # Fallback if too crowded (rare on a 100x100 grid with 20 items)
        x = np.random.randint(x_min, x_max)
        y = np.random.randint(y_min, y_max)
        used_coords.add((x, y))
        return x, y

    # 3. Assign Coordinates Based on Zone Strategy
    np.random.seed(42) # Ensure reproducible layouts
    
    layout_data = []
    for _, row in df_rides.iterrows():
        zone = row['category']
        
        # Define logical clusters on the 100x100 grid
        if zone == 'thrill':
            # Top-Left Cluster
            x, y = get_coords(5, 45, 55, 95, padding=6)
        elif zone == 'kids':
            # Bottom-Right Cluster
            x, y = get_coords(55, 95, 5, 45, padding=6)
        else: 
            # Family and Chill rides act as the transitional middle
            x, y = get_coords(30, 70, 30, 70, padding=8)
            
        layout_data.append({
            'ride_id': row['ride_id'],
            'name': row['name'],
            'x_coordinate': x,
            'y_coordinate': y,
            'zone': zone
        })
        
    # 4. Insert Food and Rest Nodes
    # Food areas spread to the edges of the clusters
    food_coords = [(15, 50), (85, 50), (50, 85)]
    for i, (fx, fy) in enumerate(food_coords):
        layout_data.append({
            'ride_id': f'F0{i+1}',
            'name': f'Food Court {i+1}',
            'x_coordinate': fx,
            'y_coordinate': fy,
            'zone': 'food'
        })
        
    # Rest areas placed centrally near all primary zones
    rest_coords = [(20, 80), (80, 20), (50, 50)]
    for i, (rx, ry) in enumerate(rest_coords):
        layout_data.append({
            'ride_id': f'R0{i+1}',
            'name': f'Rest Area {i+1}',
            'x_coordinate': rx,
            'y_coordinate': ry,
            'zone': 'rest'
        })
        
    # 5. Finalize and Export
    df_layout = pd.DataFrame(layout_data)
    df_layout.to_csv(file_name, index=False)
    
    return df_layout

# Run the generator
if __name__ == "__main__":
    final_layout = generate_water_park_layout()
    print("Layout generated and saved as waterpark_layout.csv")
    print("\nPreview of coordinates:")
    print(final_layout.head(10).to_string(index=False))