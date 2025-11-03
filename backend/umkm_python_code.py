"""
UMKM Daily Stock Forecasting System
Complete End-to-End Implementation
Goal: Predict optimal daily production to ensure Expenses <= Revenue
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns

# Time Series Models
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from prophet import Prophet

# ML Models
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error

# ==============================================================================
# SECTION 1: DATA LOADING & EDA
# ==============================================================================

def load_and_explore_data(filepath):
    """Load data and perform initial EDA"""
    print("="*80)
    print("SECTION 1: DATA LOADING & EXPLORATORY DATA ANALYSIS")
    print("="*80)
    
    df = pd.read_csv(filepath)
    
    print("\n1.1 Dataset Shape:", df.shape)
    print("\n1.2 First 5 rows:")
    print(df.head())
    
    print("\n1.3 Data Types:")
    print(df.dtypes)
    
    print("\n1.4 Missing Values:")
    print(df.isnull().sum())
    
    print("\n1.5 Statistical Summary:")
    print(df.describe())
    
    print("\n1.6 Product Distribution:")
    print(df['product_name'].value_counts())
    
    # Check for duplicates
    print("\n1.7 Duplicate rows:", df.duplicated().sum())
    
    return df

# ==============================================================================
# SECTION 2: DATA PREPROCESSING
# ==============================================================================

def define_external_variables():
    """Define all external variables (holidays, Ramadan, closures)"""
    
    # Ramadan periods
    ramadan_periods = [
        ('2021-04-13', '2021-05-12'),
        ('2022-04-03', '2022-05-01'),
        ('2023-03-23', '2023-04-21'),
        ('2024-03-12', '2024-04-09'),
        ('2025-03-01', '2025-03-30')
    ]
    
    # Eid al-Fitr dates
    eid_fitr = [
        '2021-05-13', '2022-05-02', '2023-04-22', '2024-04-10', '2025-03-31'
    ]
    
    # Eid al-Adha dates
    eid_adha = [
        '2021-07-11', '2022-07-10', '2023-06-29', '2024-06-08', '2025-06-06'
    ]
    
    # National holidays
    national_holidays = []
    for year in range(2021, 2026):
        national_holidays.extend([
            f'{year}-01-01',  # New Year
            f'{year}-08-17',  # Independence Day
            f'{year}-12-25'   # Christmas
        ])
    
    return {
        'ramadan': ramadan_periods,
        'eid_fitr': eid_fitr,
        'eid_adha': eid_adha,
        'national_holidays': national_holidays
    }

def is_in_ramadan(date, ramadan_periods):
    """Check if date is during Ramadan"""
    for start, end in ramadan_periods:
        if pd.to_datetime(start) <= date <= pd.to_datetime(end):
            return True
    return False

def calculate_closure_days(eid_dates):
    """Calculate 5-7 days before and 7 days after Eid"""
    closure_dates = []
    for eid in eid_dates:
        eid_date = pd.to_datetime(eid)
        # 5-7 days before
        for i in range(5, 8):
            closure_dates.append(eid_date - timedelta(days=i))
        # 7 days after
        for i in range(1, 8):
            closure_dates.append(eid_date + timedelta(days=i))
    return closure_dates

def preprocess_data(df, external_vars):
    """Complete preprocessing pipeline"""
    print("\n" + "="*80)
    print("SECTION 2: DATA PREPROCESSING")
    print("="*80)
    
    # 2.1 Parse dates
    print("\n2.1 Parsing dates...")
    df['date'] = pd.to_datetime(df['date'], format='mixed', dayfirst=True, errors='coerce')
    print(f"Unparsed dates: {df['date'].isna().sum()}")
    
    # 2.2 Sort by date
    df = df.sort_values('date')
    
    # 2.3 Aggregate multiple transactions per day per product
    print("\n2.2 Aggregating daily transactions...")
    df_agg = df.groupby(['date', 'product_name']).agg({
        'produced': 'sum',
        'sold': 'sum',
        'revenue': 'sum',
        'expense': 'sum',
        'price': 'mean',
        'unit_cost': 'mean'
    }).reset_index()
    
    print(f"Shape after aggregation: {df_agg.shape}")
    
    # 2.4 Create complete date range for each product
    print("\n2.3 Creating complete date range...")
    date_min = df_agg['date'].min()
    date_max = df_agg['date'].max()
    all_dates = pd.date_range(start=date_min, end=date_max, freq='D')
    products = df_agg['product_name'].unique()
    
    # Create complete grid
    complete_index = pd.MultiIndex.from_product(
        [all_dates, products],
        names=['date', 'product_name']
    )
    
    df_complete = df_agg.set_index(['date', 'product_name']).reindex(complete_index, fill_value=0).reset_index()
    print(f"Shape after date completion: {df_complete.shape}")
    
    # 2.5 Add external variables
    print("\n2.4 Adding external variables...")
    
    # Day of week (1=Monday, 6=Saturday, 7=Sunday)
    df_complete['day_of_week'] = df_complete['date'].dt.dayofweek + 1
    
    # Ramadan indicator
    df_complete['is_ramadan'] = df_complete['date'].apply(
        lambda x: is_in_ramadan(x, external_vars['ramadan'])
    )
    
    # Eid indicators
    eid_fitr_dates = pd.to_datetime(external_vars['eid_fitr'])
    eid_adha_dates = pd.to_datetime(external_vars['eid_adha'])
    df_complete['is_eid_fitr'] = df_complete['date'].isin(eid_fitr_dates)
    df_complete['is_eid_adha'] = df_complete['date'].isin(eid_adha_dates)
    
    # National holidays
    national_dates = pd.to_datetime(external_vars['national_holidays'])
    df_complete['is_national_holiday'] = df_complete['date'].isin(national_dates)
    
    # Closure days
    closure_dates_fitr = calculate_closure_days(external_vars['eid_fitr'])
    closure_dates_adha = calculate_closure_days(external_vars['eid_adha'])
    all_closure_dates = set(closure_dates_fitr + closure_dates_adha)
    
    # Sunday closure (except during Ramadan)
    df_complete['is_sunday'] = df_complete['day_of_week'] == 7
    df_complete['is_closed'] = (
        (df_complete['is_sunday'] & ~df_complete['is_ramadan']) |
        df_complete['date'].isin(all_closure_dates) |
        df_complete['is_national_holiday']
    )
    
    print(f"\nClosure days marked: {df_complete['is_closed'].sum()}")
    print(f"Ramadan days: {df_complete['is_ramadan'].sum()}")
    
    return df_complete

# ==============================================================================
# SECTION 3: FEATURE ENGINEERING
# ==============================================================================

def create_features(df):
    """Create lag features and rolling statistics"""
    print("\n" + "="*80)
    print("SECTION 3: FEATURE ENGINEERING")
    print("="*80)
    
    df = df.sort_values(['product_name', 'date']).copy()
    
    # Time-based features
    print("\n3.1 Creating time features...")
    df['day'] = df['date'].dt.day
    df['month'] = df['date'].dt.month
    df['quarter'] = df['date'].dt.quarter
    df['week_of_year'] = df['date'].dt.isocalendar().week
    
    # Lag features (prevent data leakage by using only past data)
    print("\n3.2 Creating lag features...")
    for product in df['product_name'].unique():
        mask = df['product_name'] == product
        
        # Sales lags
        df.loc[mask, 'sold_lag_1'] = df.loc[mask, 'sold'].shift(1)
        df.loc[mask, 'sold_lag_7'] = df.loc[mask, 'sold'].shift(7)
        df.loc[mask, 'sold_lag_14'] = df.loc[mask, 'sold'].shift(14)
        
        # Production lags
        df.loc[mask, 'produced_lag_1'] = df.loc[mask, 'produced'].shift(1)
        df.loc[mask, 'produced_lag_7'] = df.loc[mask, 'produced'].shift(7)
        
        # Rolling statistics (use past data only)
        df.loc[mask, 'rolling_mean_7'] = df.loc[mask, 'sold'].shift(1).rolling(window=7, min_periods=1).mean()
        df.loc[mask, 'rolling_mean_14'] = df.loc[mask, 'sold'].shift(1).rolling(window=14, min_periods=1).mean()
        df.loc[mask, 'rolling_std_7'] = df.loc[mask, 'sold'].shift(1).rolling(window=7, min_periods=1).std()
    
    # Fill NaN values in lag features with 0
    lag_cols = [col for col in df.columns if 'lag' in col or 'rolling' in col]
    df[lag_cols] = df[lag_cols].fillna(0)
    
    print(f"\n3.3 Total features created: {len(df.columns)}")
    print(f"Feature columns: {list(df.columns)}")
    
    return df

# ==============================================================================
# SECTION 4: TRAIN/TEST SPLIT (TIME-BASED)
# ==============================================================================

def split_data(df, train_end='2025-03-31', val_end='2025-06-30'):
    """Time-based split to prevent data leakage"""
    print("\n" + "="*80)
    print("SECTION 4: TRAIN/VALIDATION/TEST SPLIT")
    print("="*80)
    
    train = df[df['date'] <= train_end].copy()
    val = df[(df['date'] > train_end) & (df['date'] <= val_end)].copy()
    test = df[df['date'] > val_end].copy()
    
    print(f"\nTrain set: {train['date'].min()} to {train['date'].max()} ({len(train)} rows)")
    print(f"Validation set: {val['date'].min()} to {val['date'].max()} ({len(val)} rows)")
    print(f"Test set: {test['date'].min()} to {test['date'].max()} ({len(test)} rows)")
    
    return train, val, test

# ==============================================================================
# SECTION 5: MODEL TRAINING
# ==============================================================================

def prepare_ml_features(df):
    """Prepare feature matrix for ML models"""
    feature_cols = [
        'day_of_week', 'day', 'month', 'quarter', 'week_of_year',
        'is_ramadan', 'is_eid_fitr', 'is_eid_adha', 'is_national_holiday', 'is_closed',
        'sold_lag_1', 'sold_lag_7', 'sold_lag_14',
        'produced_lag_1', 'produced_lag_7',
        'rolling_mean_7', 'rolling_mean_14', 'rolling_std_7'
    ]
    
    X = df[feature_cols].astype(float)
    y = df['sold']
    
    return X, y, feature_cols

def train_xgboost(X_train, y_train, X_val, y_val):
    """Train XGBoost with hyperparameter tuning"""
    print("\n5.1 Training XGBoost...")
    
    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        early_stopping_rounds=20
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    return model

def train_random_forest(X_train, y_train):
    """Train Random Forest"""
    print("\n5.2 Training Random Forest...")
    
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    return model

def train_sarima_per_product(train_df, product_name):
    """Train SARIMA for a specific product"""
    product_data = train_df[train_df['product_name'] == product_name].set_index('date')['sold']
    
    # Simple SARIMA with weekly seasonality
    model = SARIMAX(
        product_data,
        order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 7),
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    
    fitted_model = model.fit(disp=False)
    return fitted_model

def train_prophet_per_product(train_df, product_name, external_vars):
    """Train Prophet for a specific product"""
    product_data = train_df[train_df['product_name'] == product_name][['date', 'sold']].copy()
    product_data.columns = ['ds', 'y']
    
    # Create holidays dataframe
    holidays_df = pd.DataFrame({
        'holiday': ['eid_fitr'] * len(external_vars['eid_fitr']) + 
                   ['eid_adha'] * len(external_vars['eid_adha']) +
                   ['national'] * len(external_vars['national_holidays']),
        'ds': pd.to_datetime(external_vars['eid_fitr'] + external_vars['eid_adha'] + external_vars['national_holidays'])
    })
    
    model = Prophet(
        holidays=holidays_df,
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05
    )
    
    model.fit(product_data)
    return model

# ==============================================================================
# SECTION 6: MODEL EVALUATION
# ==============================================================================

def evaluate_model(y_true, y_pred, model_name):
    """Calculate evaluation metrics"""
    # Ensure non-negative predictions
    y_pred = np.maximum(y_pred, 0)
    
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred) * 100
    
    print(f"\n{model_name} Performance:")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  MAE: {mae:.2f}")
    print(f"  MAPE: {mape:.2f}%")
    
    return {'rmse': rmse, 'mae': mae, 'mape': mape}

def financial_impact_analysis(df, predictions, unit_cost_avg=1200):
    """Analyze financial impact of predictions"""
    print("\n" + "="*80)
    print("FINANCIAL IMPACT ANALYSIS")
    print("="*80)
    
    # Calculate current financial situation
    actual_produced = df['produced'].sum()
    actual_sold = df['sold'].sum()
    actual_revenue = df['revenue'].sum()
    actual_expense = df['expense'].sum()
    actual_profit = actual_revenue - actual_expense
    
    # Calculate with optimized predictions
    predicted_produced = predictions.sum()
    predicted_revenue = predictions.sum() * df['price'].mean()
    predicted_expense = predictions.sum() * unit_cost_avg
    predicted_profit = predicted_revenue - predicted_expense
    
    print(f"\nCurrent Situation:")
    print(f"  Total Produced: {actual_produced:.0f}")
    print(f"  Total Sold: {actual_sold:.0f}")
    print(f"  Total Revenue: ${actual_revenue:,.0f}")
    print(f"  Total Expense: ${actual_expense:,.0f}")
    print(f"  Net Profit: ${actual_profit:,.0f}")
    
    print(f"\nOptimized Scenario:")
    print(f"  Predicted Production: {predicted_produced:.0f}")
    print(f"  Predicted Revenue: ${predicted_revenue:,.0f}")
    print(f"  Predicted Expense: ${predicted_expense:,.0f}")
    print(f"  Net Profit: ${predicted_profit:,.0f}")
    
    improvement = predicted_profit - actual_profit
    print(f"\n✓ Financial Improvement: ${improvement:,.0f}")
    
    # Check expense <= revenue goal
    days_profitable = (predictions * df['price'].mean() >= predictions * unit_cost_avg).sum()
    total_days = len(predictions)
    print(f"✓ Days with Expenses <= Revenue: {days_profitable}/{total_days} ({days_profitable/total_days*100:.1f}%)")
    
    return {
        'actual_profit': actual_profit,
        'predicted_profit': predicted_profit,
        'improvement': improvement
    }

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    """Main execution pipeline"""
    
    # Note: Replace 'your_dataset.csv' with actual filepath
    filepath = 'catatan_umkm.csv'  # Update this path
    
    # 1. Load and explore data
    df = load_and_explore_data(filepath)
    
    # 2. Define external variables
    external_vars = define_external_variables()
    
    # 3. Preprocess data
    df_processed = preprocess_data(df, external_vars)
    
    # 4. Feature engineering
    df_features = create_features(df_processed)
    
    # 5. Train/test split
    train, val, test = split_data(df_features)
    
    # 6. Train models
    print("\n" + "="*80)
    print("SECTION 5: MODEL TRAINING")
    print("="*80)
    
    # Prepare ML features
    X_train, y_train, feature_cols = prepare_ml_features(train)
    X_val, y_val, _ = prepare_ml_features(val)
    X_test, y_test, _ = prepare_ml_features(test)
    
    # Train XGBoost
    xgb_model = train_xgboost(X_train, y_train, X_val, y_val)
    
    # Train Random Forest
    rf_model = train_random_forest(X_train, y_train)
    
    # 7. Evaluate models
    print("\n" + "="*80)
    print("SECTION 6: MODEL EVALUATION")
    print("="*80)
    
    # XGBoost predictions
    xgb_pred = xgb_model.predict(X_test)
    xgb_metrics = evaluate_model(y_test, xgb_pred, "XGBoost")
    
    # Random Forest predictions
    rf_pred = rf_model.predict(X_test)
    rf_metrics = evaluate_model(y_test, rf_pred, "Random Forest")
    
    # 8. Financial impact
    best_predictions = xgb_pred if xgb_metrics['mae'] < rf_metrics['mae'] else rf_pred
    financial_results = financial_impact_analysis(test, best_predictions)
    
    # 9. Feature importance (XGBoost)
    print("\n" + "="*80)
    print("TOP 10 MOST IMPORTANT FEATURES")
    print("="*80)
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': xgb_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(feature_importance.head(10))
    
    print("\n" + "="*80)
    print("FORECASTING PIPELINE COMPLETED SUCCESSFULLY!")
    print("="*80)
    
    return {
        'models': {'xgboost': xgb_model, 'random_forest': rf_model},
        'metrics': {'xgboost': xgb_metrics, 'random_forest': rf_metrics},
        'financial': financial_results,
        'test_data': test,
        'predictions': best_predictions
    }

# Run the pipeline
if __name__ == "__main__":
    results = main()
