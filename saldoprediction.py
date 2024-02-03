import pandas as pd
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
import numpy as np

# Function to find the closest previous saldo to a given date
def get_closest_previous_saldo(data, target_date):
    if target_date in data.index:
        return data['Saldo'].at[target_date]
    else:
        previous_dates = data.index[data.index < target_date]
        if not previous_dates.empty:
            closest_date = previous_dates[-1]
            return data['Saldo'].at[closest_date]
        else:
            return 0

# Function to add lag features for saldo changes
def add_lag_features(data, lag_days=[1, 7]):
    for lag in lag_days:
        data[f'Saldo_lag_{lag}'] = data['Saldo'].shift(periods=lag)
    data.fillna(0, inplace=True)  # Handling NaN values after shifting
    return data

# Function to predict saldo for a specific period (up to the 24th of the month)
def predict_for_period(model, data):
    today = datetime.today()
    # Set the end date for prediction as the 24th of the current or next month
    if today.day > 24:
        end_date = (today.replace(day=1) + timedelta(days=32)).replace(day=24)
    else:
        end_date = today.replace(day=24)

    start_date = today
    start_saldo = get_closest_previous_saldo(data, start_date)

    # Prepare dates for prediction
    total_days = (end_date - start_date).days + 1
    future_dates = pd.DataFrame({
        'DayOfMonth': [(start_date + timedelta(days=i)).day for i in range(total_days)],
        'DayOfWeek': [(start_date + timedelta(days=i)).weekday() for i in range(total_days)],
        # Example placeholders for lag features; adjust based on actual model use
        'Saldo_lag_1': np.zeros(total_days),
        'Saldo_lag_7': np.zeros(total_days)
    })

    # Predict future daily changes
    future_changes = model.predict(future_dates)
    end_of_month_saldo = start_saldo + np.sum(future_changes)

    # Convert end_of_month_saldo to a single float value if it's not already
    if isinstance(end_of_month_saldo, (np.ndarray, pd.Series)):
        end_of_month_saldo = end_of_month_saldo.sum()

    # Format the prediction date and saldo into a string
    prediction_date = end_date.strftime('%Y-%m-%d')
    return f"{prediction_date} {end_of_month_saldo:.2f}"

# Load and preprocess your saldo data
data = pd.read_csv('/home/PI/saldo_data.csv', delimiter=',')
data.drop_duplicates(inplace=True)
data['Date'] = pd.to_datetime(data['Date'])
data.set_index('Date', inplace=True)
data.sort_index(inplace=True)

# Calculate daily changes in saldo and add additional features
data['DailyChange'] = data['Saldo'].diff().fillna(data['Saldo'].iloc[0])
data['DayOfMonth'] = data.index.day
data['DayOfWeek'] = data.index.dayofweek

# Add lagged saldo change features here. Adjust `lag_days` as necessary.
data = add_lag_features(data, lag_days=[1, 7])

# Enhanced feature set including the lagged features
X = data[['DayOfMonth', 'DayOfWeek', 'Saldo_lag_1', 'Saldo_lag_7']]
y = data['DailyChange']

# Split, Train, and Evaluate the Model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

scores = cross_val_score(model, X, y, scoring='neg_root_mean_squared_error', cv=5)
print("Cross-validated RMSE:", -scores.mean())

predictions = model.predict(X_test)
print("Test RMSE:", np.sqrt(mean_squared_error(y_test, predictions)))
print("Test MAE:", mean_absolute_error(y_test, predictions))  # Additional metric

# Prediction for up to the 24th remains unchanged
prediction = predict_for_period(model, data)
print("End of current month prediction:", prediction)