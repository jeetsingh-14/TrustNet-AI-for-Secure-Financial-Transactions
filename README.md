# TrustNet AI - Real-Time Fraud Detection System

TrustNet AI is a production-grade, real-time fraud detection system that uses machine learning to detect anomalies in financial transaction data. The system includes a React.js frontend for analysts and a FastAPI backend with real-time alerting capabilities.

## Architecture

The TrustNet AI system consists of several interconnected components that work together to provide fraud detection:

```
Data Source → ML Model → SQLite → FastAPI → React Dashboard
                          ↓
                      Alert System
```

The system follows this data flow:
1. Transaction data is processed by the ML model
2. The ML model scores transactions and flags potential fraud
3. Flagged transactions are stored in PostgreSQL and trigger alerts
4. The React dashboard displays transaction data and fraud alerts

## Components

### Backend

- **FastAPI**: Main backend server with endpoints for submitting transactions, retrieving fraud flags, and triggering model scoring
- **XGBoost + LIME**: Machine learning model with explainability for fraud detection
- **SQLite + SQLAlchemy**: Database for storing transactions and fraud alerts
- **Alert System**: Notifications via email or Slack

### Frontend

- **React.js**: Dashboard for monitoring transactions and fraud alerts
- **Chart.js**: Visualizations for transaction data and model performance
- **Bootstrap**: Responsive UI components

## Getting Started

### Prerequisites

- Python 3.13
- Node.js and npm
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/trustnet-ai.git
   cd trustnet-ai
   ```

2. Set up the Python virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```
   pip install -r backend/requirements.txt
   ```

4. Initialize the SQLite database:
   ```
   cd backend
   python init_db.py
   cd ..
   ```
   This will create the SQLite database file and seed it with sample data.

5. Install frontend dependencies:
   ```
   cd react-dashboard
   npm install
   cd ..
   ```

6. (Optional) Configure environment variables for alerts in `backend/.env`:
   ```
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   SENDER_EMAIL=your_email@example.com
   SENDER_PASSWORD=your_email_password
   RECIPIENT_EMAILS=analyst1@example.com,analyst2@example.com
   ```

7. Configure the API URL for the React dashboard:
   ```
   cd react-dashboard
   # Copy the example environment file
   cp .env.example .env
   # Edit .env to set the correct API URL if needed
   # For local development, the default http://localhost:8002 should work
   # For accessing from other machines, use the actual IP or hostname
   # REACT_APP_API_URL=http://your-server-ip:8002
   cd ..
   ```

8. Start the backend server:
   ```
   cd backend
   # Make sure the database is initialized first
   # If you haven't run init_db.py yet, run it now:
   # python init_db.py

   # For local development only
   uvicorn main:app --reload

   # Or to make the API accessible from other machines on the network
   # uvicorn main:app --host 0.0.0.0 --reload
   ```

9. In a new terminal, start the frontend:
   ```
   cd react-dashboard
   npm start
   ```

10. Access the dashboard at http://localhost:3000

### Usage

#### Dashboard

The dashboard provides:
- Transaction monitoring
- Fraud alerts with risk scores and explanations
- Analytics on transaction patterns and fraud detection
- Filtering capabilities by account, amount, risk score, and type

#### API Endpoints

- `POST /predict`: Submit a transaction for fraud scoring
- `GET /transactions`: Retrieve transaction history
- `GET /alerts`: Retrieve fraud alerts
- `GET /transactions/{id}`: Get details for a specific transaction

## Model Details

TrustNet AI uses XGBoost as the primary supervised learning model for fraud detection. The model is trained on the PaySim dataset and uses features such as:

- Transaction amount
- Account balances before and after transaction
- Transaction type
- Account type
- Balance differences

LIME (Local Interpretable Model-agnostic Explanations) is used to explain model predictions, helping analysts understand why a transaction was flagged as fraudulent.

## Additional Features

### Data Simulation

You can simulate transaction data using the data_simulator.py script:

```
cd backend
python data_simulator.py --api http://localhost:8002/predict
```

Or to directly insert into the database:

```
python data_simulator.py
```

### Alert Service

To run the alert service that polls the database for fraud alerts:

```
cd backend
python alerts/alert_sender.py
```

## Troubleshooting

### Database Connection

If you encounter database connection issues:
1. Ensure the SQLite database file exists (run `python init_db.py` if it doesn't)
2. Check that the database file has the correct permissions
3. If you're still having issues, try deleting the database file and recreating it with `python init_db.py`

### Model Loading

If the model fails to load:
1. Ensure the `models` directory exists and contains the trained model files
2. Check the MODEL_DIR setting in `backend/.env`

### API Connection

If the React dashboard cannot connect to the FastAPI backend:
1. Ensure the FastAPI server is running
2. Check that the server is accessible from the machine running the React dashboard
3. Configure the API URL in `react-dashboard/.env` (copy from `.env.example` if needed)
4. For accessing the API from other machines, the FastAPI server now binds to `0.0.0.0` instead of `127.0.0.1`
5. Update the `REACT_APP_API_URL` in `react-dashboard/.env` to use the actual IP address or hostname of the server

## License

This project is licensed under the MIT License - see the LICENSE file for details.
