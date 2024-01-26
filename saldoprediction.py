import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np
import calendar
from datetime import datetime, timedelta

# Function to find the closest previous saldo to a given date
def get_closest_previous_saldo(data, target_date):
    if target_date in data.index:
        return data['Saldo'].at[target_date]
    else:
        # Find the closest previous date for which we have data
        previous_dates = data.index[data.index < target_date]
        if not previous_dates.empty:
            closest_date = previous_dates[-1]
            return data['Saldo'].at[closest_date]
        else:
            return 0  # Return 0 or some default value if no previous data is available

# Function to predict saldo for a specific period
def predict_for_period(model, data):
    today = datetime.today()

    # Define the start and end dates for prediction
    if today.day > 25:
        # Start from the 26th of the current month
        start_date = today.replace(day=26)
        # End on the 25th of the next month
        end_date = (start_date + timedelta(days=32)).replace(day=25)
    else:
        # Start from the 26th of the previous month
        start_date = (today.replace(day=1) - timedelta(days=1)).replace(day=26)
        # End on the 25th of the current month
        end_date = today.replace(day=25)

    start_saldo = get_closest_previous_saldo(data, start_date)

    # Prepare dates for prediction
    total_days = (end_date - start_date).days + 1
    future_dates = pd.DataFrame({
        'DayOfMonth': [(start_date + timedelta(days=i)).day for i in range(total_days)],
        'DayOfWeek': [(start_date + timedelta(days=i)).weekday() for i in range(total_days)]
    })

    # Predict future daily changes
    future_changes = model.predict(future_dates)
    end_of_month_saldo = start_saldo + np.sum(future_changes)

    # Add 4000 on the 25th
    if 25 in future_dates['DayOfMonth'].values:
        end_of_month_saldo += 0

    return round(end_of_month_saldo, 2)

# Load your saldo data
data = pd.read_csv('/home/PI/saldo_data.csv', delimiter=',')

# Remove duplicate entries
data.drop_duplicates(inplace=True)

# Preprocess your data: Convert dates to features
data['Date'] = pd.to_datetime(data['Date'])
data.set_index('Date', inplace=True)
data.sort_index(inplace=True)

# Calculate daily changes in saldo
data['DailyChange'] = data['Saldo'].diff()

# Fill NaN values (first row) with initial saldo change
data['DailyChange'].fillna(data['Saldo'].iloc[0], inplace=True)

# Add additional features
data['DayOfMonth'] = data.index.day
data['DayOfWeek'] = data.index.dayofweek  # Monday=0, Sunday=6

# Define features and target variable
X = data[['DayOfMonth', 'DayOfWeek']]
y = data['DailyChange']

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Define and train the model
model = LinearRegression()
model.fit(X_train, y_train)

# Cross-validation to evaluate the model
scores = cross_val_score(model, X, y, scoring='neg_root_mean_squared_error', cv=5)
print("Cross-validated RMSE:", -scores.mean())

# Make predictions and evaluate the model
predictions = model.predict(X_test)
print("Test RMSE:", np.sqrt(mean_squared_error(y_test, predictions)))

# Predict for the period 26th to 25th
prediction = predict_for_period(model, data)
print("End of current month prediction:", prediction)
