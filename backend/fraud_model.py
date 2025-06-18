"""
fraud_model.py - Trains and saves the fraud detection model using XGBoost.

This module handles the training of a supervised machine learning model (XGBoost)
for fraud detection in financial transactions. It includes data preprocessing,
feature engineering, model training, evaluation, and persistence.

Memory Optimization Features:
- Data sampling: Option to use only a fraction of the data for training
- Data type optimization: Option to use float32 instead of float64 to reduce memory usage
- Reduced parameter grid: Smaller hyperparameter search space when memory_efficient=True
- Memory-efficient training: Uses 'hist' tree method and single-threaded processing
- Fallback mechanisms: Gracefully handles memory errors by falling back to simpler models
- Progressive sampling: Automatically reduces sample size if memory errors persist

Usage:
    python fraud_model.py [--sample-size SAMPLE_SIZE] [--use-float32] [--memory-efficient] [--full-data]
"""

import os
import pickle
import random
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, precision_recall_curve, auc, f1_score, precision_score, recall_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import lime
import lime.lime_tabular
import logging
from typing import Tuple, Dict, Any, List, Optional
from db_utils import read_fraud_data
from imblearn.over_sampling import SMOTE

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FraudModel:
    """Class for training and evaluating a fraud detection model."""

    def __init__(
        self,
        model_dir: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"),
        test_size: float = 0.4,
        random_state: int = 42,
        sample_size: Optional[float] = None,
        use_float32: bool = True,
        memory_efficient: bool = True
    ):
        """
        Initialize the fraud model.

        Args:
            model_dir: Directory to save the trained model
            test_size: Proportion of the dataset to include in the test split
            random_state: Random seed for reproducibility
            sample_size: If provided, use only this fraction of data for training (0.0-1.0)
            use_float32: If True, use float32 instead of float64 to reduce memory usage
            memory_efficient: If True, use memory-efficient approaches for training
        """
        self.model_dir = model_dir
        self.test_size = test_size
        self.random_state = random_state
        self.sample_size = sample_size
        self.use_float32 = use_float32
        self.memory_efficient = memory_efficient

        # Create model directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)

        # Initialize model and preprocessor
        self.model = None
        self.preprocessor = None
        self.feature_names = None

    def load_data(self) -> pd.DataFrame:
        """
        Load the dataset from the database.
        If sample_size is provided, only a fraction of the data is loaded.

        Returns:
            DataFrame containing the transaction data
        """
        try:
            logger.info("Loading data from database")

            # Use the read_fraud_data function from db_utils.py
            df = read_fraud_data(sample_size=self.sample_size, random_state=self.random_state)

            # Convert float64 columns to float32 if use_float32 is True
            if self.use_float32:
                for col in df.select_dtypes(include=['float64']).columns:
                    df[col] = df[col].astype('float32')
                logger.info("Converted float64 columns to float32 to reduce memory usage")

            return df
        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise

    def preprocess_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Preprocess the data for model training.

        Args:
            df: Raw transaction data

        Returns:
            Tuple of (features DataFrame, target Series)
        """
        logger.info("Preprocessing data")

        # Make a copy to avoid modifying the original
        data = df.copy()

        # Extract target variable
        y = data['isFraud']

        # Drop unnecessary columns
        X = data.drop(['isFraud', 'isFlaggedFraud'], axis=1)

        return X, y

    def engineer_features(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Perform feature engineering on the dataset.

        Args:
            X: Features DataFrame

        Returns:
            DataFrame with engineered features
        """
        logger.info("Engineering features")

        # Create a copy to avoid modifying the original
        X_engineered = X.copy()

        # Extract account type from nameOrig and nameDest
        X_engineered['originAccountType'] = X_engineered['nameOrig'].str[0]
        X_engineered['destAccountType'] = X_engineered['nameDest'].str[0]

        # Calculate transaction-related features
        X_engineered['transactionRatio'] = X_engineered['amount'] / (X_engineered['oldbalanceOrg'] + 1)
        X_engineered['origOldBalanceIsZero'] = (X_engineered['oldbalanceOrg'] == 0).astype(int)
        X_engineered['origNewBalanceIsZero'] = (X_engineered['newbalanceOrig'] == 0).astype(int)
        X_engineered['destOldBalanceIsZero'] = (X_engineered['oldbalanceDest'] == 0).astype(int)
        X_engineered['destNewBalanceIsZero'] = (X_engineered['newbalanceDest'] == 0).astype(int)

        # Calculate balance difference
        X_engineered['origBalanceDiff'] = X_engineered['oldbalanceOrg'] - X_engineered['newbalanceOrig']
        X_engineered['destBalanceDiff'] = X_engineered['newbalanceDest'] - X_engineered['oldbalanceDest']

        # Check if balance difference matches amount
        X_engineered['origBalanceDiffEqualsAmount'] = (
            (X_engineered['origBalanceDiff'] - X_engineered['amount']).abs() < 0.01
        ).astype(int)

        X_engineered['destBalanceDiffEqualsAmount'] = (
            (X_engineered['destBalanceDiff'] - X_engineered['amount']).abs() < 0.01
        ).astype(int)

        # Drop original ID columns as they're not useful for prediction
        X_engineered = X_engineered.drop(['nameOrig', 'nameDest'], axis=1)

        return X_engineered

    def create_preprocessor(self, X: pd.DataFrame) -> ColumnTransformer:
        """
        Create a preprocessor for the features.

        Args:
            X: Features DataFrame

        Returns:
            ColumnTransformer for preprocessing features
        """
        logger.info("Creating feature preprocessor")

        # Identify categorical and numerical columns
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
        numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

        # Create preprocessor
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numerical_cols),
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols)
            ]
        )

        # Store feature names for later use
        self.feature_names = numerical_cols + categorical_cols

        return preprocessor

    def split_data(self, X: pd.DataFrame, y: pd.Series) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Split the data into training and testing sets.

        Args:
            X: Features DataFrame
            y: Target Series

        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        logger.info("Splitting data into train and test sets")
        return train_test_split(X, y, test_size=self.test_size, random_state=self.random_state, stratify=y)

    def train_model(self, X_train: np.ndarray, y_train: pd.Series, smote_applied: bool = False) -> xgb.XGBClassifier:
        """
        Train the XGBoost model.

        Args:
            X_train: Training features
            y_train: Training target
            smote_applied: Whether SMOTE was successfully applied to the training data

        Returns:
            Trained XGBoost classifier
        """
        logger.info("Training XGBoost model")

        # Only calculate and apply scale_pos_weight if SMOTE was not applied
        scale_pos_weight_value = None
        if not smote_applied:
            # Calculate class imbalance ratio for scale_pos_weight
            # Count number of negative and positive samples
            neg_count = np.sum(y_train == 0)
            pos_count = np.sum(y_train == 1)

            # Calculate scale_pos_weight as ratio of negative to positive samples
            scale_pos_weight_value = neg_count / pos_count if pos_count > 0 else 1.0
            logger.info(f"Class imbalance ratio (scale_pos_weight): {scale_pos_weight_value:.2f}")
        else:
            logger.info("SMOTE was applied, not using scale_pos_weight")

        # Define the model with tree_method='hist' for better memory efficiency
        model_params = {
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'use_label_encoder': False,
            'random_state': self.random_state,
            'tree_method': 'hist',  # More memory-efficient algorithm
        }

        # Only add scale_pos_weight if SMOTE was not applied
        if not smote_applied and scale_pos_weight_value is not None:
            model_params['scale_pos_weight'] = scale_pos_weight_value

        model = xgb.XGBClassifier(**model_params)

        # Create a validation set for early stopping
        X_train_fit, X_val, y_train_fit, y_val = train_test_split(
            X_train, y_train, test_size=0.2, random_state=self.random_state, stratify=y_train
        )
        logger.info(f"Training set size: {X_train_fit.shape[0]}, Validation set size: {X_val.shape[0]}")

        # Create evaluation set for early stopping
        eval_set = [(X_val, y_val)]

        # Define parameter grid for hyperparameter tuning
        # Use a smaller grid if memory_efficient is True
        if self.memory_efficient:
            logger.info("Using reduced parameter grid for memory efficiency")
            param_grid = {
                'n_estimators': [100, 200],
                'max_depth': [3, 5],
                'learning_rate': [0.1],
                'subsample': [0.8],
                'colsample_bytree': [0.8]
            }
        else:
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_depth': [3, 5, 7],
                'learning_rate': [0.01, 0.05, 0.1],
                'subsample': [0.7, 0.8, 0.9],
                'colsample_bytree': [0.7, 0.8, 0.9]
            }

        # Use memory-efficient approach for cross-validation if specified
        if self.memory_efficient:
            # Use StratifiedKFold with smaller number of folds
            cv = StratifiedKFold(n_splits=2, shuffle=True, random_state=self.random_state)
            n_jobs = 1  # Use single job to reduce memory usage
            logger.info("Using memory-efficient cross-validation settings")
        else:
            cv = 3
            n_jobs = -1

        # Add early_stopping_rounds to model parameters
        fit_params = {
            'early_stopping_rounds': 10,
            'eval_set': eval_set,
            'verbose': False
        }

        # Use GridSearchCV for hyperparameter tuning
        grid_search = GridSearchCV(
            estimator=model,
            param_grid=param_grid,
            cv=cv,
            scoring='roc_auc',
            n_jobs=n_jobs,
            verbose=1
        )

        try:
            # Fit the model with early stopping
            grid_search.fit(X_train_fit, y_train_fit, **fit_params)

            # Get the best model
            best_model = grid_search.best_estimator_
            logger.info(f"Best parameters: {grid_search.best_params_}")

            # Retrain the best model on the full training set with early stopping
            best_model.fit(X_train, y_train, early_stopping_rounds=10, eval_set=eval_set, verbose=False)

            return best_model

        except (MemoryError, np.core._exceptions._ArrayMemoryError) as e:
            logger.warning(f"Memory error during grid search: {e}. Falling back to default model.")
            # If grid search fails due to memory error, fall back to a simple model with default parameters
            simple_model = xgb.XGBClassifier(
                objective='binary:logistic',
                eval_metric='auc',
                use_label_encoder=False,
                random_state=self.random_state,
                tree_method='hist',
                max_depth=3,
                n_estimators=100
            )

            # Try to fit with a smaller subset if we still have memory issues
            try:
                simple_model.fit(X_train, y_train)
            except (MemoryError, np.core._exceptions._ArrayMemoryError):
                logger.warning("Still experiencing memory issues. Trying with a smaller subset of data.")
                # Use only a small subset of the data if we're still having memory issues
                sample_size = min(10000, len(X_train))
                indices = np.random.choice(len(X_train), sample_size, replace=False)
                simple_model.fit(X_train[indices], y_train.iloc[indices] if hasattr(y_train, 'iloc') else y_train[indices])

            return simple_model

    def evaluate_model(self, model: xgb.XGBClassifier, X_test: np.ndarray, y_test: pd.Series) -> Dict[str, Any]:
        """
        Evaluate the trained model.

        Args:
            model: Trained XGBoost model
            X_test: Test features
            y_test: Test target

        Returns:
            Dictionary with evaluation metrics
        """
        logger.info("Evaluating model")

        # Make probability predictions
        y_prob = model.predict_proba(X_test)[:, 1]

        # Default threshold predictions
        y_pred_default = model.predict(X_test)
        default_threshold = 0.5

        # Calculate Precision-Recall curve and AUC
        precision_curve, recall_curve, thresholds = precision_recall_curve(y_test, y_prob)
        pr_auc = auc(recall_curve, precision_curve)
        logger.info(f"Precision-Recall AUC: {pr_auc:.4f}")

        # Find optimal threshold based on F1 score
        f1_scores = []
        for threshold in thresholds:
            y_pred = (y_prob >= threshold).astype(int)
            f1_scores.append(f1_score(y_test, y_pred))

        optimal_idx_f1 = np.argmax(f1_scores)
        optimal_threshold_f1 = thresholds[optimal_idx_f1]
        logger.info(f"Optimal threshold based on F1 score: {optimal_threshold_f1:.4f}")

        # Find threshold where precision is at least 0.9
        high_precision_thresholds = []
        for i, p in enumerate(precision_curve):
            if p >= 0.9 and i < len(thresholds):
                high_precision_thresholds.append((i, thresholds[i], recall_curve[i]))

        # If we found thresholds with precision >= 0.9, find the one with highest recall
        optimal_threshold_precision = None
        if high_precision_thresholds:
            # Sort by recall (descending)
            high_precision_thresholds.sort(key=lambda x: x[2], reverse=True)
            optimal_threshold_precision = high_precision_thresholds[0][1]
            logger.info(f"Optimal threshold for Precision >= 0.9: {optimal_threshold_precision:.4f} (Recall: {high_precision_thresholds[0][2]:.4f})")
        else:
            logger.info("No threshold found with Precision >= 0.9")

        # Use the F1-optimized threshold if precision-based threshold is not available
        optimal_threshold = optimal_threshold_precision if optimal_threshold_precision is not None else optimal_threshold_f1
        logger.info(f"Using optimal threshold: {optimal_threshold:.4f}")

        # Predictions with optimal threshold
        y_pred_optimal = (y_prob >= optimal_threshold).astype(int)

        # Calculate metrics with default threshold (0.5)
        default_conf_matrix = confusion_matrix(y_test, y_pred_default)
        default_f1 = f1_score(y_test, y_pred_default)
        default_precision = precision_score(y_test, y_pred_default)
        default_recall = recall_score(y_test, y_pred_default)

        # Calculate metrics with optimal threshold
        optimal_conf_matrix = confusion_matrix(y_test, y_pred_optimal)
        optimal_f1 = f1_score(y_test, y_pred_optimal)
        optimal_precision = precision_score(y_test, y_pred_optimal)
        optimal_recall = recall_score(y_test, y_pred_optimal)

        # ROC AUC Score
        auc_score = roc_auc_score(y_test, y_prob)

        # Log results for default threshold
        logger.info(f"Metrics with default threshold ({default_threshold}):")
        logger.info(f"Confusion Matrix:\n{default_conf_matrix}")
        logger.info(f"F1 Score: {default_f1:.4f}")
        logger.info(f"Precision: {default_precision:.4f}")
        logger.info(f"Recall: {default_recall:.4f}")
        logger.info(f"Classification Report:\n{classification_report(y_test, y_pred_default)}")

        # Log results for optimal threshold
        logger.info(f"Metrics with optimal threshold ({optimal_threshold:.4f}):")
        logger.info(f"Confusion Matrix:\n{optimal_conf_matrix}")
        logger.info(f"F1 Score: {optimal_f1:.4f}")
        logger.info(f"Precision: {optimal_precision:.4f}")
        logger.info(f"Recall: {optimal_recall:.4f}")
        logger.info(f"Classification Report:\n{classification_report(y_test, y_pred_optimal)}")

        # Log ROC AUC Score
        logger.info(f"ROC AUC Score: {auc_score:.4f}")

        # Return metrics
        return {
            'default_threshold': default_threshold,
            'default_confusion_matrix': default_conf_matrix,
            'default_f1_score': default_f1,
            'default_precision': default_precision,
            'default_recall': default_recall,

            'optimal_threshold': optimal_threshold,
            'optimal_confusion_matrix': optimal_conf_matrix,
            'optimal_f1_score': optimal_f1,
            'optimal_precision': optimal_precision,
            'optimal_recall': optimal_recall,

            'roc_auc_score': auc_score,
            'pr_auc_score': pr_auc,

            'precision_curve': precision_curve,
            'recall_curve': recall_curve,
            'thresholds': thresholds
        }

    def generate_lime_explanations(self, model: xgb.XGBClassifier, X_test: np.ndarray) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Generate LIME explanations for model explainability.

        Args:
            model: Trained XGBoost model
            X_test: Test features (can be NumPy array or Pandas DataFrame)

        Returns:
            Tuple of (LIME explanations, feature names)
        """
        logger.info("Generating LIME explanations for model explainability")

        try:
            # Convert to numpy array if it's a DataFrame
            X_test_processed = X_test.values if hasattr(X_test, 'values') else X_test

            # Generate feature names dynamically based on input shape
            feature_count = X_test_processed.shape[1]
            feature_names = [f'feature_{i}' for i in range(feature_count)]

            # Create a training dataset for the LIME explainer
            # We need a sample of the original data to train the explainer
            X_sample = X_test_processed[:100] if X_test_processed.shape[0] >= 100 else X_test_processed

            # Create LIME explainer with empty categorical_features
            explainer = lime.lime_tabular.LimeTabularExplainer(
                X_sample,
                feature_names=feature_names,
                categorical_features=[],  # Set to empty list as required
                class_names=['Not Fraud', 'Fraud'],
                mode='classification',
                random_state=self.random_state
            )

            # Generate explanations for a subset of test instances
            # (generating for all would be too computationally expensive)
            lime_explanations = []
            num_samples = min(10, X_test_processed.shape[0])  # Limit to 10 samples

            for i in range(num_samples):
                # Get explanation for this instance
                exp = explainer.explain_instance(
                    X_test_processed[i], 
                    model.predict_proba,
                    num_features=10  # Keep to 10 features as required
                )

                # Extract the explanation data
                explanation_data = []
                for feature, weight in exp.as_list():
                    explanation_data.append({
                        'feature': feature,
                        'impact': weight
                    })

                lime_explanations.append(explanation_data)

            return lime_explanations, feature_names

        except Exception as e:
            logger.error(f"Error generating LIME explanations: {e}")
            # Return empty explanation if anything fails
            return [], []

    def save_model(self, model: xgb.XGBClassifier, preprocessor: ColumnTransformer) -> str:
        """
        Save the trained model and preprocessor.

        Args:
            model: Trained XGBoost model
            preprocessor: Feature preprocessor

        Returns:
            Path to the saved model
        """
        logger.info("Saving model and preprocessor")

        # Always save to models directory regardless of self.model_dir
        fixed_model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

        # Create a model directory if it doesn't exist
        os.makedirs(fixed_model_dir, exist_ok=True)

        # Save model to fixed path
        model_path = os.path.join(fixed_model_dir, 'xgboost_fraud_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)

        # Save preprocessor to the fixed model directory
        preprocessor_path = os.path.join(fixed_model_dir, 'preprocessor.pkl')
        with open(preprocessor_path, 'wb') as f:
            pickle.dump(preprocessor, f)

        # Save feature names to fixed model directory
        feature_names_path = os.path.join(fixed_model_dir, 'feature_names.pkl')
        with open(feature_names_path, 'wb') as f:
            pickle.dump(self.feature_names, f)

        logger.info(f"Model saved to {model_path}")
        logger.info(f"Preprocessor saved to {preprocessor_path}")

        return model_path

    def train_and_save(self) -> Dict[str, Any]:
        """
        Train the model and save it.

        Returns:
            Dictionary with model path and evaluation metrics
        """
        try:
            # Load data
            df = self.load_data()

            # Preprocess data
            X, y = self.preprocess_data(df)

            # Engineer features
            X_engineered = self.engineer_features(X)

            # Create preprocessor
            self.preprocessor = self.create_preprocessor(X_engineered)

            # Split data
            X_train, X_test, y_train, y_test = self.split_data(X_engineered, y)

            # Preprocess features
            X_train_processed = self.preprocessor.fit_transform(X_train)
            X_test_processed = self.preprocessor.transform(X_test)

            # Apply SMOTE for oversampling the minority class (fraud)
            logger.info("Applying SMOTE to oversample the minority class (fraud)")
            try:
                smote = SMOTE(random_state=self.random_state)
                X_train_resampled, y_train_resampled = smote.fit_resample(X_train_processed, y_train)
                logger.info(f"Data shape after SMOTE: {X_train_resampled.shape}, Class distribution: {np.bincount(y_train_resampled.astype(int))}")
            except Exception as e:
                logger.warning(f"SMOTE failed: {e}. Falling back to original imbalanced data.")
                X_train_resampled, y_train_resampled = X_train_processed, y_train

            # Train model with flag indicating whether SMOTE was successfully applied
            smote_applied = X_train_resampled is not X_train_processed
            self.model = self.train_model(X_train_resampled, y_train_resampled, smote_applied=smote_applied)

            # Evaluate model
            metrics = self.evaluate_model(self.model, X_test_processed, y_test)

            # Generate LIME explanations
            lime_explanations, feature_names = self.generate_lime_explanations(self.model, X_test_processed)

            # Save model
            model_path = self.save_model(self.model, self.preprocessor)

            return {
                'model_path': model_path,
                'metrics': metrics,
                'lime_explanations': lime_explanations,
                'feature_names': feature_names
            }

        except Exception as e:
            logger.error(f"Error during model training: {e}")
            raise

def main():
    """Main function to train and save the fraud detection model."""
    import argparse

    parser = argparse.ArgumentParser(description='Train fraud detection model')
    parser.add_argument('--model-dir', default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"), help='Directory to save model')
    parser.add_argument('--test-size', type=float, default=0.2, help='Test set size')
    parser.add_argument('--random-state', type=int, default=42, help='Random state')
    parser.add_argument('--sample-size', type=float, default=0.3, help='Fraction of data to use (0.0-1.0)')
    parser.add_argument('--use-float32', action='store_true', default=True, help='Use float32 instead of float64')
    parser.add_argument('--memory-efficient', action='store_true', default=True, help='Use memory-efficient approaches')
    parser.add_argument('--full-data', action='store_true', help='Use full dataset (overrides sample-size)')

    args = parser.parse_args()

    # Determine sample size
    sample_size = None if args.full_data else args.sample_size

    # Create and train model
    fraud_model = FraudModel(
        model_dir=args.model_dir,
        test_size=args.test_size,
        random_state=args.random_state,
        sample_size=sample_size,
        use_float32=args.use_float32,
        memory_efficient=args.memory_efficient
    )

    try:
        result = fraud_model.train_and_save()
        logger.info(f"Model training completed. Model saved to {result['model_path']}")

        # Log ROC and PR AUC scores
        logger.info(f"Model ROC AUC Score: {result['metrics']['roc_auc_score']:.4f}")
        logger.info(f"Model PR AUC Score: {result['metrics']['pr_auc_score']:.4f}")

        # Log metrics with default threshold
        logger.info("=== Metrics with default threshold ===")
        logger.info(f"Default threshold: {result['metrics']['default_threshold']}")
        logger.info(f"F1 Score: {result['metrics']['default_f1_score']:.4f}")
        logger.info(f"Precision: {result['metrics']['default_precision']:.4f}")
        logger.info(f"Recall: {result['metrics']['default_recall']:.4f}")
        logger.info(f"Confusion Matrix:\n{result['metrics']['default_confusion_matrix']}")

        # Log metrics with optimal threshold
        logger.info("=== Metrics with optimal threshold ===")
        logger.info(f"Optimal threshold: {result['metrics']['optimal_threshold']:.4f}")
        logger.info(f"F1 Score: {result['metrics']['optimal_f1_score']:.4f}")
        logger.info(f"Precision: {result['metrics']['optimal_precision']:.4f}")
        logger.info(f"Recall: {result['metrics']['optimal_recall']:.4f}")
        logger.info(f"Confusion Matrix:\n{result['metrics']['optimal_confusion_matrix']}")

        logger.info("Model training and evaluation completed successfully.")
    except Exception as e:
        logger.error(f"Error during model training: {e}")
        raise

if __name__ == "__main__":
    main()
