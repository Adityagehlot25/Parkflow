import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import os

def load_and_split_data(filepath=None):
    """Loads the dataset and splits it into training and testing sets."""
    # If no filepath is provided, use the default in the same directory as this script
    if filepath is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(script_dir, 'waterpark_wait_time_dataset.csv')
    
    print("📂 Loading dataset...")
    df = pd.read_csv(filepath)
    
    # Define our input features (X) and target variable (y)
    features = [
        'time_of_day', 
        'day_type', 
        'people_in_queue', 
        'capacity_per_cycle', 
        'cycle_time', 
        'popularity'
    ]
    target = 'actual_wait_time'
    
    X = df[features]
    y = df[target]
    
    # 80/20 Train-Test Split
    return train_test_split(X, y, test_size=0.2, random_state=42)


def build_preprocessor():
    """Creates a preprocessing pipeline for numerical and categorical data."""
    categorical_features = ['time_of_day', 'day_type']
    numerical_features = ['people_in_queue', 'capacity_per_cycle', 'cycle_time', 'popularity']
    
    # OneHotEncode categories (drop='first' avoids the dummy variable trap in Linear Regression)
    # StandardScaler scales numerical features to have mean=0 and variance=1
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), categorical_features)
        ])
        
    return preprocessor


def train_and_evaluate():
    """Trains multiple models, evaluates them, and saves the best one."""
    
    # 1. Get Data
    X_train, X_test, y_train, y_test = load_and_split_data()
    preprocessor = build_preprocessor()
    
    # 2. Define Models to compare
    models = {
        'Linear Regression': Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', LinearRegression())
        ]),
        'Random Forest Regressor': Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
        ])
    }
    
    # 3. Train & Evaluate Loop
    results = {}
    print("\n🚀 Training models...\n")
    
    for name, model_pipeline in models.items():
        # Train the model (Pre-processing happens automatically here!)
        model_pipeline.fit(X_train, y_train)
        
        # Make predictions on the unseen test set
        y_pred = model_pipeline.predict(X_test)
        
        # Calculate Metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        # Store results for comparison
        results[name] = {
            'pipeline': model_pipeline, 
            'MAE': mae, 
            'RMSE': rmse
        }
        
        # Print Results
        print(f"--- {name} ---")
        print(f"MAE:  {mae:.2f} minutes")
        print(f"RMSE: {rmse:.2f} minutes\n")

    # 4. Compare and select the best model
    best_model_name = min(results, key=lambda k: results[k]['RMSE'])
    best_pipeline = results[best_model_name]['pipeline']
    
    print("=========================================")
    print(f"🏆 BEST MODEL: {best_model_name}")
    print(f"Lowest RMSE achieved: {results[best_model_name]['RMSE']:.2f} minutes")
    print("=========================================\n")
    
    # 5. Save the best model
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_filename = os.path.join(script_dir, 'waterpark_wait_time_model.pkl')
    joblib.dump(best_pipeline, model_filename)
    print(f"💾 Saved the {best_model_name} pipeline to '{model_filename}'")
    print("ℹ️ Note: The saved .pkl file includes the OneHotEncoder and Scaler.")

if __name__ == "__main__":
    train_and_evaluate()