"""
UMKM Time Series Forecasting API
FastAPI Backend with Complete ML Pipeline
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
import io
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')

# ML Models
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error
from sklearn.preprocessing import LabelEncoder
import joblib
import base64
from io import BytesIO

# Plotting
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

app = FastAPI(title="UMKM Forecasting API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for session data
sessions = {}

# =====================================================================
# UTILITY FUNCTIONS
# =====================================================================

def add_calendar_features(df):
    """Add comprehensive calendar and business features"""
    df = df.copy()
    
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    df['dayofweek'] = df['date'].dt.dayofweek
    df['dayofyear'] = df['date'].dt.dayofyear
    df['weekofyear'] = df['date'].dt.isocalendar().week
    df['quarter'] = df['date'].dt.quarter
    df['is_weekend'] = (df['dayofweek'] >= 5).astype(int)
    df['is_month_start'] = df['date'].dt.is_month_start.astype(int)
    df['is_month_end'] = df['date'].dt.is_month_end.astype(int)
    
    # Ramadan periods
    ramadan_periods = [
        ('2021-04-13', '2021-05-12'), ('2022-04-03', '2022-05-01'),
        ('2023-03-23', '2023-04-21'), ('2024-03-12', '2024-04-09'),
        ('2025-03-01', '2025-03-30')
    ]
    df['is_ramadan'] = 0
    for start, end in ramadan_periods:
        mask = (df['date'] >= start) & (df['date'] <= end)
        df.loc[mask, 'is_ramadan'] = 1
    
    # Eid holidays
    eid_dates = ['2021-05-13', '2022-05-02', '2023-04-22', '2024-04-10', '2025-03-31',
                 '2021-07-11', '2022-07-10', '2023-06-29', '2024-06-08', '2025-06-06']
    df['is_eid'] = df['date'].astype(str).isin(eid_dates).astype(int)
    
    # Days to next Eid
    df['days_to_eid'] = 365
    for eid_str in eid_dates:
        eid_date = pd.to_datetime(eid_str)
        days_diff = (eid_date - df['date']).dt.days
        df['days_to_eid'] = df['days_to_eid'].where(
            (days_diff < 0) | (days_diff >= df['days_to_eid']), days_diff
        )
    df['near_eid'] = (df['days_to_eid'] <= 7).astype(int)
    
    # National holidays
    df['is_holiday'] = (
        ((df['month'] == 1) & (df['day'] == 1)) |
        ((df['month'] == 8) & (df['day'] == 17)) |
        ((df['month'] == 12) & (df['day'] == 25))
    ).astype(int)
    
    # Cyclical encoding
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    df['dow_sin'] = np.sin(2 * np.pi * df['dayofweek'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['dayofweek'] / 7)
    
    return df

def split_product_timeseries(product_df, train_ratio=0.70, val_ratio=0.15):
    """Split time series maintaining temporal order"""
    product_df = product_df.sort_values('date').reset_index(drop=True)
    n = len(product_df)
    
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train = product_df.iloc[:train_end].copy()
    val = product_df.iloc[train_end:val_end].copy()
    test = product_df.iloc[val_end:].copy()
    
    return train, val, test

def create_lag_features_per_product(train_df, val_df, test_df):
    """Create causal lag features per product"""
    
    train_with_lags, val_with_lags, test_with_lags = [], [], []
    
    for product in train_df['product_name'].unique():
        train_p = train_df[train_df['product_name'] == product].copy().sort_values('date')
        val_p = val_df[val_df['product_name'] == product].copy().sort_values('date')
        test_p = test_df[test_df['product_name'] == product].copy().sort_values('date')
        
        def add_lags(df, target='sold'):
            df = df.copy()
            series = df[target].copy()
            
            for lag in [1, 2, 3, 7, 14, 21, 28]:
                df[f'{target}_lag{lag}'] = series.shift(lag)
            
            for window in [7, 14, 28]:
                shifted = series.shift(1)
                df[f'{target}_ma{window}'] = shifted.rolling(window, min_periods=1).mean()
                df[f'{target}_std{window}'] = shifted.rolling(window, min_periods=1).std()
                df[f'{target}_max{window}'] = shifted.rolling(window, min_periods=1).max()
                df[f'{target}_min{window}'] = shifted.rolling(window, min_periods=1).min()
            
            df[f'{target}_ema7'] = series.shift(1).ewm(span=7, adjust=False).mean()
            df[f'{target}_ema14'] = series.shift(1).ewm(span=14, adjust=False).mean()
            df[f'{target}_trend'] = series.diff(7)
            
            return df
        
        train_p = add_lags(train_p)
        
        train_val = pd.concat([train_p, val_p], ignore_index=True).sort_values('date')
        train_val = add_lags(train_val)
        val_p = train_val.iloc[len(train_p):].copy()
        
        all_data = pd.concat([train_p, val_p, test_p], ignore_index=True).sort_values('date')
        all_data = add_lags(all_data)
        test_p = all_data.iloc[len(train_p) + len(val_p):].copy()
        
        train_with_lags.append(train_p)
        val_with_lags.append(val_p)
        test_with_lags.append(test_p)
    
    return pd.concat(train_with_lags), pd.concat(val_with_lags), pd.concat(test_with_lags)

def calculate_financial_scenario(test_df, production_strategy, strategy_name):
    """Calculate profit, waste, and service metrics"""
    tc = test_df.copy()
    
    if strategy_name == "Historical Average":
        hist_avg = tc.groupby('product_name')['sold'].transform('mean')
        tc['produced_sim'] = np.ceil(hist_avg)
    elif strategy_name == "Perfect":
        tc['produced_sim'] = tc['sold']
    else:
        tc['produced_sim'] = production_strategy
    
    tc['actual_demand'] = tc['sold']
    tc['sold_actual'] = np.minimum(tc['produced_sim'], tc['actual_demand'])
    tc['waste'] = np.maximum(tc['produced_sim'] - tc['actual_demand'], 0)
    tc['stockout'] = np.maximum(tc['actual_demand'] - tc['produced_sim'], 0)
    
    tc['revenue'] = tc['sold_actual'] * tc['price']
    tc['production_cost'] = tc['produced_sim'] * tc['unit_cost']
    tc['waste_cost'] = tc['waste'] * tc['unit_cost']
    tc['opportunity_cost'] = tc['stockout'] * (tc['price'] - tc['unit_cost'])
    tc['total_cost'] = tc['production_cost'] + tc['opportunity_cost']
    tc['profit'] = tc['revenue'] - tc['total_cost']
    
    return {
        'total_revenue': float(tc['revenue'].sum()),
        'production_cost': float(tc['production_cost'].sum()),
        'waste_cost': float(tc['waste_cost'].sum()),
        'opportunity_cost': float(tc['opportunity_cost'].sum()),
        'total_profit': float(tc['profit'].sum()),
        'total_waste': float(tc['waste'].sum()),
        'total_stockouts': float(tc['stockout'].sum()),
        'service_level': float((1 - tc['stockout'].sum() / tc['actual_demand'].sum()) * 100) if tc['actual_demand'].sum() > 0 else 100
    }

# =====================================================================
# API ENDPOINTS
# =====================================================================

@app.get("/")
async def root():
    return {"message": "UMKM Forecasting API is running", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process CSV file"""
    try:
        contents = await file.read()
        df_raw = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Parse dates
        df_raw['date'] = pd.to_datetime(df_raw['date'], format='mixed', dayfirst=True, errors='coerce')
        df_raw = df_raw.dropna(subset=['date']).sort_values('date').reset_index(drop=True)
        
        # Aggregate daily
        df = df_raw.groupby(['date', 'product_name'], as_index=False).agg({
            'produced': 'sum',
            'sold': 'sum',
            'price': 'mean',
            'unit_cost': 'mean',
            'revenue': 'sum',
            'expense': 'sum'
        })
        
        # Generate session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Store data
        sessions[session_id] = {
            'df_raw': df,
            'upload_time': datetime.now().isoformat()
        }
        
        # Basic stats
        stats = {
            'session_id': session_id,
            'total_records': len(df),
            'date_range': {
                'start': df['date'].min().strftime('%Y-%m-%d'),
                'end': df['date'].max().strftime('%Y-%m-%d'),
                'days': (df['date'].max() - df['date'].min()).days
            },
            'products': {
                'count': df['product_name'].nunique(),
                'names': sorted(df['product_name'].unique().tolist())
            },
            'sales_stats': {
                'mean_produced': float(df['produced'].mean()),
                'mean_sold': float(df['sold'].mean()),
                'total_revenue': float(df['revenue'].sum()),
                'total_expense': float(df['expense'].sum())
            }
        }
        
        return JSONResponse(content=stats)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@app.post("/api/train/{session_id}")
async def train_models(session_id: str):
    """Train ML models on uploaded data"""
    try:
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        df = sessions[session_id]['df_raw'].copy()
        
        # Feature engineering
        df = add_calendar_features(df)
        df = df.dropna(subset=['sold'])
        
        # Split data per product
        train_list, val_list, test_list = [], [], []
        for product in df['product_name'].unique():
            product_df = df[df['product_name'] == product].copy()
            train_p, val_p, test_p = split_product_timeseries(product_df)
            train_list.append(train_p)
            val_list.append(val_p)
            test_list.append(test_p)
        
        train = pd.concat(train_list, ignore_index=True)
        val = pd.concat(val_list, ignore_index=True)
        test = pd.concat(test_list, ignore_index=True)
        
        # Encode products
        le_product = LabelEncoder()
        le_product.fit(train['product_name'])
        train['product_encoded'] = le_product.transform(train['product_name'])
        val['product_encoded'] = le_product.transform(val['product_name'])
        test['product_encoded'] = le_product.transform(test['product_name'])
        
        # Create lag features
        train, val, test = create_lag_features_per_product(train, val, test)
        
        # Feature columns
        feature_cols = [
            'year', 'month', 'dayofweek', 'weekofyear', 'quarter', 'dayofyear',
            'is_weekend', 'is_month_start', 'is_month_end',
            'is_ramadan', 'is_eid', 'near_eid', 'is_holiday', 'days_to_eid',
            'product_encoded', 'price', 'unit_cost',
            'month_sin', 'month_cos', 'dow_sin', 'dow_cos',
            'sold_lag1', 'sold_lag2', 'sold_lag3', 'sold_lag7', 'sold_lag14', 'sold_lag21', 'sold_lag28',
            'sold_ma7', 'sold_ma14', 'sold_ma28',
            'sold_std7', 'sold_std14', 'sold_std28',
            'sold_max7', 'sold_max14', 'sold_max28',
            'sold_min7', 'sold_min14', 'sold_min28',
            'sold_ema7', 'sold_ema14', 'sold_trend'
        ]
        
        # Impute missing values
        train_stats = {}
        for product in train['product_name'].unique():
            train_stats[product] = {}
            product_train = train[train['product_name'] == product]
            for col in feature_cols:
                if col in product_train.columns:
                    train_stats[product][col] = product_train[col].median()
        
        global_stats = {col: train[col].median() for col in feature_cols if col in train.columns}
        
        def impute(df_split):
            df_split = df_split.copy()
            for product in df_split['product_name'].unique():
                mask = df_split['product_name'] == product
                if product in train_stats:
                    for col in feature_cols:
                        if col in df_split.columns and df_split.loc[mask, col].isnull().any():
                            fill_val = train_stats[product].get(col, global_stats.get(col, 0))
                            df_split.loc[mask, col] = df_split.loc[mask, col].fillna(fill_val)
            return df_split
        
        train = impute(train).dropna(subset=feature_cols + ['sold'])
        val = impute(val).dropna(subset=feature_cols + ['sold'])
        test = impute(test).dropna(subset=feature_cols + ['sold'])
        
        X_train, y_train = train[feature_cols], train['sold']
        X_val, y_val = val[feature_cols], val['sold']
        X_test, y_test = test[feature_cols], test['sold']
        
        # Train models
        models = {
            'XGBoost': XGBRegressor(
                n_estimators=200, max_depth=7, learning_rate=0.05,
                min_child_weight=5, subsample=0.8, colsample_bytree=0.8,
                random_state=42, n_jobs=-1, verbosity=0
            ),
            'Random Forest': RandomForestRegressor(
                n_estimators=200, max_depth=15, min_samples_split=10,
                random_state=42, n_jobs=-1
            ),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=200, max_depth=6, learning_rate=0.05,
                random_state=42
            )
        }
        
        results = {}
        for name, model in models.items():
            model.fit(X_train, y_train)
            
            test_pred = np.maximum(model.predict(X_test), 0)
            
            results[name] = {
                'test_mae': float(mean_absolute_error(y_test, test_pred)),
                'test_rmse': float(np.sqrt(mean_squared_error(y_test, test_pred))),
                'test_r2': float(r2_score(y_test, test_pred)),
                'test_mape': float(mean_absolute_percentage_error(y_test, test_pred) * 100)
            }
        
        best_model_name = min(results.items(), key=lambda x: x[1]['test_mae'])[0]
        best_model = models[best_model_name]
        test_pred = np.maximum(best_model.predict(X_test), 0)
        
        # Store in session
        test['predicted'] = test_pred
        test['error'] = test['sold'] - test['predicted']
        test['abs_error'] = np.abs(test['error'])
        
        sessions[session_id].update({
            'train': train,
            'val': val,
            'test': test,
            'models': models,
            'best_model_name': best_model_name,
            'best_model': best_model,
            'le_product': le_product,
            'feature_cols': feature_cols,
            'results': results
        })
        
        # Calculate financial scenarios
        scenarios = {}
        scenarios['Baseline'] = calculate_financial_scenario(test, None, "Historical Average")
        scenarios['ML Prediction'] = calculate_financial_scenario(test, np.ceil(test_pred), "ML")
        scenarios['Perfect'] = calculate_financial_scenario(test, test['sold'], "Perfect")
        
        sessions[session_id]['scenarios'] = scenarios
        
        # Prepare response
        response = {
            'session_id': session_id,
            'best_model': best_model_name,
            'split_info': {
                'train_size': len(train),
                'val_size': len(val),
                'test_size': len(test),
                'train_period': f"{train['date'].min().strftime('%Y-%m-%d')} to {train['date'].max().strftime('%Y-%m-%d')}",
                'test_period': f"{test['date'].min().strftime('%Y-%m-%d')} to {test['date'].max().strftime('%Y-%m-%d')}"
            },
            'model_performance': results,
            'financial_scenarios': scenarios,
            'accuracy_breakdown': {
                'within_5pct': int((test['abs_error'] / test['sold'] * 100 <= 5).sum()),
                'within_10pct': int((test['abs_error'] / test['sold'] * 100 <= 10).sum()),
                'within_20pct': int((test['abs_error'] / test['sold'] * 100 <= 20).sum()),
                'total': len(test)
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

@app.get("/api/product-performance/{session_id}")
async def get_product_performance(session_id: str):
    """Get per-product performance metrics"""
    try:
        if session_id not in sessions or 'test' not in sessions[session_id]:
            raise HTTPException(status_code=404, detail="Session not found or not trained")
        
        test = sessions[session_id]['test']
        
        product_perf = []
        for product in sorted(test['product_name'].unique()):
            product_test = test[test['product_name'] == product]
            product_perf.append({
                'product': product,
                'days': len(product_test),
                'avg_actual': float(product_test['sold'].mean()),
                'avg_predicted': float(product_test['predicted'].mean()),
                'mae': float(product_test['abs_error'].mean()),
                'mape': float((product_test['abs_error'] / product_test['sold'] * 100).mean())
            })
        
        return JSONResponse(content={'products': product_perf})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feature-importance/{session_id}")
async def get_feature_importance(session_id: str):
    """Get feature importance from best model"""
    try:
        if session_id not in sessions or 'best_model' not in sessions[session_id]:
            raise HTTPException(status_code=404, detail="Session not found or not trained")
        
        best_model = sessions[session_id]['best_model']
        feature_cols = sessions[session_id]['feature_cols']
        
        feat_imp = pd.DataFrame({
            'feature': feature_cols,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False).head(15)
        
        return JSONResponse(content={
            'features': feat_imp['feature'].tolist(),
            'importance': feat_imp['importance'].tolist()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/time-series/{session_id}/{product_name}")
async def get_time_series(session_id: str, product_name: str):
    """Get time series data for a specific product"""
    try:
        if session_id not in sessions or 'test' not in sessions[session_id]:
            raise HTTPException(status_code=404, detail="Session not found")
        
        test = sessions[session_id]['test']
        product_test = test[test['product_name'] == product_name].sort_values('date')
        
        return JSONResponse(content={
            'dates': product_test['date'].dt.strftime('%Y-%m-%d').tolist(),
            'actual': product_test['sold'].tolist(),
            'predicted': product_test['predicted'].tolist()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)