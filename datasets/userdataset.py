import pandas as pd
import numpy as np

def generate_waterpark_users(num_users: int = 5000, file_name: str = "waterpark_users.csv") -> pd.DataFrame:
    """
    Generates a synthetic dataset of water park visitors for recommendation ML modeling.
    
    Args:
        num_users (int): Number of rows to generate (target 3000-8000).
        file_name (str): The output CSV filename.
        
    Returns:
        pd.DataFrame: The generated user dataset.
    """
    # 1. Initialize Dataset & Base Randomness
    np.random.seed(42)
    user_ids = [f"USR_{i:05d}" for i in range(1, num_users + 1)]
    
    # Random group sizes between 1 and 6
    group_sizes = np.random.randint(1, 7, size=num_users)
    
    # Random budget distribution (30% low, 50% medium, 20% high)
    budgets = np.random.choice(['low', 'medium', 'high'], size=num_users, p=[0.3, 0.5, 0.2])

    # 2. Determine Age Group based on Group Size
    # We use random floats to assign probabilities dynamically based on the group size rule
    rand_vals = np.random.rand(num_users)
    
    # Conditions
    small_group = group_sizes <= 2
    large_group = group_sizes >= 3
    
    # Age Group Assignment Logic:
    # Small groups: 70% adults, 20% mixed, 10% kids
    # Large groups: 10% adults, 40% mixed, 50% kids
    age_groups = np.where(
        small_group,
        np.where(rand_vals < 0.7, 'adults', np.where(rand_vals < 0.9, 'mixed', 'kids')),
        np.where(rand_vals < 0.5, 'kids', np.where(rand_vals < 0.9, 'mixed', 'adults'))
    )

    # 3. Determine Thrill Preference based on Age Group
    # Generate the distributions for each category
    kids_thrill = np.random.uniform(0.1, 0.6, size=num_users)
    adults_thrill = np.random.uniform(0.4, 1.0, size=num_users)
    mixed_thrill = np.random.uniform(0.3, 0.8, size=num_users)

    # Apply the correct distribution based on the assigned age group
    thrill_prefs = np.select(
        [age_groups == 'kids', age_groups == 'adults'],
        [kids_thrill, adults_thrill],
        default=mixed_thrill
    ).round(2)

    # 4. Calculate Visit Duration
    # Base duration scales with group size (e.g., size 1 = 2.8 hrs, size 6 = 6.8 hrs)
    base_duration = 2.0 + (group_sizes * 0.8)
    
    # Budget affects duration
    budget_bump = np.select(
        [budgets == 'high', budgets == 'medium'],
        [1.5, 0.5], 
        default=0.0
    )
    
    # Add Gaussian noise for realism
    duration_noise = np.random.normal(loc=0.0, scale=1.2, size=num_users)
    
    # Combine, clip to boundaries (2-10), and round to nearest half-hour proxy (1 decimal)
    raw_duration = base_duration + budget_bump + duration_noise
    visit_durations = np.clip(raw_duration, 2.0, 10.0).round(1)

    # 5. Construct and Return DataFrame
    df_users = pd.DataFrame({
        'user_id': user_ids,
        'group_size': group_sizes,
        'age_group': age_groups,
        'thrill_preference': thrill_prefs,
        'visit_duration_hours': visit_durations,
        'budget_level': budgets
    })
    
    # Save to CSV
    df_users.to_csv(file_name, index=False)
    
    return df_users

# Execute the script
if __name__ == "__main__":
    user_dataset = generate_waterpark_users(num_users=5000)
    print(f"Dataset generated successfully with {len(user_dataset)} rows.\n")
    print("Sample Output:")
    print(user_dataset.head(10).to_string(index=False))