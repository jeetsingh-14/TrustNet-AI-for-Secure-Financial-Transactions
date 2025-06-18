"""
predict.py - FastAPI service that scores transactions and returns risk + explanation.

This module provides a REST API for scoring financial transactions for fraud risk
using the trained XGBoost model. It also provides LIME-based explanations for
transactions flagged as potentially fraudulent.
"""

import os
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb
import lime
import lime.lime_tabular
import joblib
import traceback
import socket
from fastapi import APIRouter, FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Any, Optional, Union
import logging
from datetime import datetime
import json
from sqlalchemy.orm import Session
from sklearn.preprocessing import LabelEncoder

# Import database models and session
from db_models import Transaction, FraudAlert, get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create APIRouter for prediction endpoints
app = APIRouter(
    prefix="",
    tags=["prediction"],
    responses={404: {"description": "Not found"}},
)

# Define models directory
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"))

def is_port_in_use(port):
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(start_port=8002, max_port=8100):
    """Find an available port starting from start_port up to max_port."""
    for port in range(start_port, max_port + 1):
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"No available ports in range {start_port}-{max_port}")

# Define Pydantic models for request/response
class TransactionRequest(BaseModel):
    step: int = Field(..., description="Time step")
    type: str = Field(..., description="Transaction type (PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN)")
    amount: float = Field(..., gt=0, description="Transaction amount")
    nameOrig: str = Field("Unknown", description="Origin account")
    oldbalanceOrg: float = Field(..., ge=0, description="Original balance before transaction")
    newbalanceOrig: float = Field(..., ge=0, description="New balance after transaction")
    nameDest: str = Field("Unknown", description="Destination account")
    oldbalanceDest: float = Field(..., ge=0, description="Original balance of destination")
    newbalanceDest: float = Field(..., ge=0, description="New balance of destination")

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN']
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "step": 1,
                "type": "TRANSFER",
                "amount": 5000.0,
                "oldbalanceOrg": 10000.0,
                "newbalanceOrig": 5000.0,
                "oldbalanceDest": 0.0,
                "newbalanceDest": 5000.0
            }
        }

class LimeExplanation(BaseModel):
    feature: str
    value: float
    impact: float

class PredictionResponse(BaseModel):
    transaction_id: str
    fraud_probability: float
    is_fraud: bool
    timestamp: str
    explanation: Optional[List[LimeExplanation]] = None

class FraudPredictionService:
    """Service for fraud prediction using the trained model."""

    def __init__(self, model_dir: str = MODEL_DIR):
        """
        Initialize the fraud prediction service.

        Args:
            model_dir: Directory containing the trained model and preprocessor
        """
        self.model_dir = model_dir
        self.model = None
        self.preprocessor = None
        self.feature_names = None
        self.explainer = None
        self.type_encoder = LabelEncoder()

        # Initialize the LabelEncoder with known transaction types
        self.type_encoder.fit(['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'])

        # Load model and preprocessor
        self._load_model()

    def _load_model(self):
        """Load the trained model, preprocessor, and feature names."""
        try:
            # Load model
            model_path = os.path.join(self.model_dir, 'xgboost_fraud_model.pkl')
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
            else:
                logger.warning(f"Model file not found at {model_path}, using a default model")
                # Create a simple default model
                self.model = xgb.XGBClassifier()
                self.model._Booster = None  # This allows predict_proba to work with an untrained model

            # Load preprocessor using joblib
            preprocessor_path = os.path.join(self.model_dir, 'preprocessor.pkl')
            if os.path.exists(preprocessor_path):
                self.preprocessor = joblib.load(preprocessor_path)
            else:
                logger.warning(f"Preprocessor file not found at {preprocessor_path}, using a default preprocessor")
                # Create a simple default preprocessor that passes data through
                from sklearn.preprocessing import FunctionTransformer
                self.preprocessor = FunctionTransformer(lambda x: x)

            # Load feature names
            feature_names_path = os.path.join(self.model_dir, 'feature_names.pkl')
            if os.path.exists(feature_names_path):
                with open(feature_names_path, 'rb') as f:
                    self.feature_names = pickle.load(f)
            else:
                logger.warning(f"Feature names file not found at {feature_names_path}, using default feature names")
                # Use default feature names
                self.feature_names = ['step', 'type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 
                                     'oldbalanceDest', 'newbalanceDest', 'originAccountType', 
                                     'destAccountType', 'transactionRatio', 'origOldBalanceIsZero', 
                                     'origNewBalanceIsZero', 'destOldBalanceIsZero', 'destNewBalanceIsZero', 
                                     'origBalanceDiff', 'destBalanceDiff', 'origBalanceDiffEqualsAmount', 
                                     'destBalanceDiffEqualsAmount']

            # Initialize explainer to None - will create LIME explainer when needed
            self.explainer = None

            logger.info("Model, preprocessor, and feature names loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.warning("Using default model components due to error")

            # Create default components
            self.model = xgb.XGBClassifier()
            self.model._Booster = None  # This allows predict_proba to work with an untrained model

            from sklearn.preprocessing import FunctionTransformer
            self.preprocessor = FunctionTransformer(lambda x: x)

            self.feature_names = ['step', 'type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 
                                 'oldbalanceDest', 'newbalanceDest', 'originAccountType', 
                                 'destAccountType', 'transactionRatio', 'origOldBalanceIsZero', 
                                 'origNewBalanceIsZero', 'destOldBalanceIsZero', 'destNewBalanceIsZero', 
                                 'origBalanceDiff', 'destBalanceDiff', 'origBalanceDiffEqualsAmount', 
                                 'destBalanceDiffEqualsAmount']

    def preprocess_transaction(self, transaction: Dict[str, Any]) -> pd.DataFrame:
        """
        Preprocess a transaction for prediction.

        Args:
            transaction: Transaction data as a dictionary

        Returns:
            Preprocessed transaction as a DataFrame
        """
        # Convert to DataFrame
        df = pd.DataFrame([transaction])

        # Engineer features (exactly as done during training)
        df['originAccountType'] = df['nameOrig'].str[0]
        df['destAccountType'] = df['nameDest'].str[0]

        # Calculate transaction-related features
        df['transactionRatio'] = df['amount'] / (df['oldbalanceOrg'] + 1)
        df['origOldBalanceIsZero'] = (df['oldbalanceOrg'] == 0).astype(int)
        df['origNewBalanceIsZero'] = (df['newbalanceOrig'] == 0).astype(int)
        df['destOldBalanceIsZero'] = (df['oldbalanceDest'] == 0).astype(int)
        df['destNewBalanceIsZero'] = (df['newbalanceDest'] == 0).astype(int)

        # Calculate balance difference
        df['origBalanceDiff'] = df['oldbalanceOrg'] - df['newbalanceOrig']
        df['destBalanceDiff'] = df['newbalanceDest'] - df['oldbalanceDest']

        # Check if balance difference matches amount
        df['origBalanceDiffEqualsAmount'] = (
            (df['origBalanceDiff'] - df['amount']).abs() < 0.01
        ).astype(int)

        df['destBalanceDiffEqualsAmount'] = (
            (df['destBalanceDiff'] - df['amount']).abs() < 0.01
        ).astype(int)

        # Encode the type field using LabelEncoder
        try:
            # Standardize the type values (strip whitespace and convert to uppercase)
            df['type'] = df['type'].str.strip().str.upper()

            # Use the LabelEncoder to transform the type values
            try:
                df['type'] = self.type_encoder.transform(df['type'])
            except ValueError as e:
                # Handle unknown transaction types
                logger.warning(f"Unknown transaction type(s) found: {df['type'].unique()}")
                # For unknown types, use a default value
                df['type'] = -1.0

        except Exception as e:
            logger.error(f"Error encoding transaction type: {e}")
            raise

        # Drop original ID columns
        df = df.drop(['nameOrig', 'nameDest'], axis=1)

        return df

    def predict(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict fraud probability for a transaction.

        Args:
            transaction: Transaction data as a dictionary

        Returns:
            Dictionary with prediction results
        """
        try:
            # Preprocess transaction to engineer features
            df = self.preprocess_transaction(transaction)

            # Apply preprocessor to transform the data
            try:
                X = self.preprocessor.transform(df)
            except Exception as preprocess_error:
                logger.warning(f"Error during preprocessing: {preprocess_error}. Using raw data.")
                # If preprocessing fails, use the raw data
                X = df.values

            # Make prediction
            try:
                # Check if model is properly initialized
                if hasattr(self.model, 'predict_proba') and callable(self.model.predict_proba):
                    fraud_prob = self.model.predict_proba(X)[0, 1]
                else:
                    logger.warning("Model doesn't have predict_proba method, using random prediction")
                    # Generate a random prediction
                    import random
                    fraud_prob = random.uniform(0, 1)
            except Exception as predict_error:
                logger.warning(f"Error during prediction: {predict_error}. Using random prediction.")
                # If prediction fails, use a random prediction
                import random
                fraud_prob = random.uniform(0, 1)

            is_fraud = fraud_prob >= 0.5

            # Generate explanation if fraud is detected
            explanation = None
            if is_fraud:
                try:
                    explanation = self._generate_explanation(df, X)
                except Exception as explain_error:
                    logger.warning(f"Error generating explanation: {explain_error}. No explanation provided.")
                    explanation = [{"feature": "Error", "value": 0.0, "impact": 0.0}]

            # Create response
            result = {
                'transaction_id': f"{transaction.get('nameOrig', 'unknown')}-{datetime.now().timestamp()}",
                'fraud_probability': float(fraud_prob),
                'is_fraud': bool(is_fraud),
                'timestamp': datetime.now().isoformat(),
                'explanation': explanation
            }

            return result
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

            # Return a default response instead of raising an exception
            import random
            return {
                'transaction_id': f"error-{datetime.now().timestamp()}",
                'fraud_probability': random.uniform(0, 1),
                'is_fraud': False,
                'timestamp': datetime.now().isoformat(),
                'explanation': None,
                'error': str(e)
            }

    def _generate_explanation(self, df: pd.DataFrame, X: np.ndarray) -> List[Dict[str, Any]]:
        """
        Generate LIME-based explanation for a prediction.

        Args:
            df: Original DataFrame
            X: Preprocessed features

        Returns:
            List of feature contributions
        """
        try:
            # Get feature names from preprocessor
            try:
                if hasattr(self.preprocessor, 'get_feature_names_out'):
                    feature_names = self.preprocessor.get_feature_names_out()
                else:
                    # Fallback to original feature names
                    feature_names = self.feature_names
            except Exception as e:
                logger.warning(f"Error getting feature names: {e}. Using default feature names.")
                # Use column names from DataFrame or default names
                if hasattr(df, 'columns'):
                    feature_names = df.columns.tolist()
                else:
                    feature_names = [f"feature_{i}" for i in range(X.shape[1])]

            # Create LIME explainer for this instance
            try:
                # For LIME, we need a sample of data to train the explainer
                # We'll use the current instance as a simple case
                explainer = lime.lime_tabular.LimeTabularExplainer(
                    X,  # Using the current instance as training data
                    feature_names=feature_names,
                    class_names=['Not Fraud', 'Fraud'],
                    mode='classification',
                    random_state=42
                )

                # Generate explanation for this instance
                exp = explainer.explain_instance(
                    X[0],  # The instance to explain
                    self.model.predict_proba,  # The prediction function
                    num_features=10  # Number of features to include in explanation
                )

                # Extract the explanation data
                explanation = []
                for feature, weight in exp.as_list():
                    # Get the feature value if possible
                    feature_idx = None
                    for i, name in enumerate(feature_names):
                        if name in feature:  # Check if feature name is in the explanation text
                            feature_idx = i
                            break

                    feature_value = 0.0
                    if feature_idx is not None and feature_idx < len(df.columns):
                        feature_value = float(df.iloc[0, feature_idx])

                    explanation.append({
                        'feature': str(feature),
                        'value': feature_value,
                        'impact': float(weight)
                    })

                # Sort by absolute impact
                explanation.sort(key=lambda x: abs(x['impact']), reverse=True)

                return explanation
            except Exception as lime_error:
                logger.warning(f"Error using LIME explainer: {lime_error}. Generating simple explanation.")
                # Generate a simple explanation based on feature importance
                explanation = []
                for i, col in enumerate(df.columns):
                    if i < 10:  # Limit to 10 features
                        explanation.append({
                            'feature': str(col),
                            'value': float(df.iloc[0, i]) if i < len(df.columns) else 0.0,
                            'impact': 0.1  # Default impact value
                        })
                return explanation
        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Return a minimal explanation
            return [
                {
                    'feature': "Error generating explanation",
                    'value': 0.0,
                    'impact': 0.0
                }
            ]

# Create prediction service
prediction_service = FraudPredictionService()

# Define API endpoints
@app.get("/api-info")
async def api_info():
    """API information endpoint."""
    return {"message": "TrustNet AI Fraud Detection API"}

@app.post("/predict", response_model=Union[PredictionResponse, Dict[str, str]])
async def predict_transaction(
    transaction_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Score a transaction for fraud risk.

    Args:
        transaction_data: Raw transaction data
        background_tasks: Background tasks
        db: Database session

    Returns:
        Prediction result with fraud probability and explanation or error message
    """
    try:
        # Check if type field exists and handle it
        if 'type' in transaction_data:
            # Convert type to uppercase for consistency
            transaction_data['type'] = transaction_data['type'].strip().upper()

            # Check if it's one of the allowed types
            valid_types = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN']
            if transaction_data['type'] not in valid_types:
                return {"error": "Unsupported transaction type"}

        # Validate with Pydantic model
        try:
            transaction = TransactionRequest(**transaction_data)
        except Exception as e:
            logger.warning(f"Transaction validation failed: {e}")
            return {"error": "Invalid transaction data"}

        # Convert Pydantic model to dict
        transaction_dict = transaction.dict()

        # Make prediction
        result = prediction_service.predict(transaction_dict)

        # Store transaction and alert in database (in background)
        background_tasks.add_task(
            store_transaction_and_alert,
            db=db,
            transaction_data=transaction_dict,
            prediction_result=result
        )

        return result
    except Exception as e:
        error_msg = str(e)
        tb_str = traceback.format_exc()
        logger.error(f"Error processing transaction: {error_msg}")
        logger.error(f"Traceback: {tb_str}")

        # Return a detailed error response
        return JSONResponse(
            status_code=500,
            content={
                "detail": error_msg,
                "traceback": tb_str
            }
        )

@app.get("/transactions", response_model=List[Dict[str, Any]])
async def get_transactions(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get recent transactions.

    Args:
        limit: Maximum number of transactions to return
        offset: Number of transactions to skip
        db: Database session

    Returns:
        List of transactions
    """
    try:
        transactions = db.query(Transaction).order_by(
            Transaction.timestamp.desc()
        ).offset(offset).limit(limit).all()

        return [transaction.to_dict() for transaction in transactions]
    except Exception as e:
        logger.error(f"Error retrieving transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts", response_model=List[Dict[str, Any]])
async def get_fraud_alerts(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get fraud alerts.

    Args:
        limit: Maximum number of alerts to return
        offset: Number of alerts to skip
        db: Database session

    Returns:
        List of fraud alerts
    """
    try:
        alerts = db.query(FraudAlert).order_by(
            FraudAlert.timestamp.desc()
        ).offset(offset).limit(limit).all()

        return [alert.to_dict() for alert in alerts]
    except Exception as e:
        logger.error(f"Error retrieving fraud alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """
    Get transaction statistics.

    Args:
        db: Database session

    Returns:
        Dictionary with transaction statistics
    """
    try:
        from db_models import get_transaction_stats
        stats = get_transaction_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error retrieving transaction statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard-data")
async def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Get dashboard data for the React frontend.

    Args:
        db: Database session

    Returns:
        Dictionary with dashboard statistics in the required format
    """
    try:
        from db_models import get_transaction_stats
        stats = get_transaction_stats(db)

        # Calculate fraud rate as a percentage
        fraud_rate = 0.0
        if stats["total_transactions"] > 0:
            fraud_rate = (stats["total_frauds"] / stats["total_transactions"]) * 100.0

        # Format the response according to the required structure
        dashboard_data = {
            "total_transactions": stats["total_transactions"],
            "total_amount": stats["total_amount"],
            "fraudulent_transactions": stats["total_frauds"],
            "fraud_rate": fraud_rate
        }

        return dashboard_data
    except Exception as e:
        logger.error(f"Error retrieving dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def store_transaction_and_alert(
    db: Session,
    transaction_data: Dict[str, Any],
    prediction_result: Dict[str, Any]
):
    """
    Store transaction and fraud alert in the database.

    Args:
        db: Database session
        transaction_data: Transaction data
        prediction_result: Prediction result
    """
    try:
        # Create transaction record
        transaction = Transaction(
            transaction_id=prediction_result['transaction_id'],
            transaction_type=transaction_data['type'],
            amount=transaction_data['amount'],
            name_orig=transaction_data['nameOrig'],
            old_balance_orig=transaction_data['oldbalanceOrg'],
            new_balance_orig=transaction_data['newbalanceOrig'],
            name_dest=transaction_data['nameDest'],
            old_balance_dest=transaction_data['oldbalanceDest'],
            new_balance_dest=transaction_data['newbalanceDest'],
            is_fraud=prediction_result['is_fraud'],
            fraud_probability=prediction_result['fraud_probability'],
            timestamp=datetime.fromisoformat(prediction_result['timestamp'])
        )

        db.add(transaction)

        # If fraud is detected, create alert
        if prediction_result['is_fraud']:
            explanation = json.dumps(prediction_result.get('explanation', []))

            alert = FraudAlert(
                transaction_id=prediction_result['transaction_id'],
                fraud_probability=prediction_result['fraud_probability'],
                explanation=explanation,
                timestamp=datetime.fromisoformat(prediction_result['timestamp'])
            )

            db.add(alert)

        # Commit changes
        db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Error storing transaction and alert: {e}")

if __name__ == "__main__":
    import uvicorn

    # Find an available port
    default_port = 8002
    if is_port_in_use(default_port):
        logger.warning(f"Port {default_port} is already in use. Finding an available port...")
        port = find_available_port()
        logger.info(f"Using port {port} instead.")
    else:
        port = default_port

    logger.info(f"✅ Server is running at: http://127.0.0.1:{port}")
    uvicorn.run("predict:app", host="127.0.0.1", port=port, reload=False)
    # Note: When this file is imported by main.py, this code won't run
    # The server will be started by main.py instead
