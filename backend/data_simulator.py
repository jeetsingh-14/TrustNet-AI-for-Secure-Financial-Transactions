"""
data_simulator.py - Reads PaySim dataset and simulates transactions.

This module simulates a real-time stream of financial transactions by reading
from the PaySim dataset and either sending them to the API or directly inserting
them into the database.
"""

import json
import time
import pandas as pd
import requests
import logging
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import argparse
from db_utils import read_fraud_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class TransactionSimulator:
    """Simulates financial transactions by sending to API or database."""

    def __init__(
        self, 
        batch_size: int = 100,
        delay_seconds: float = 0.5,
        api_url: Optional[str] = None,
        sample_size: Optional[float] = None
    ):
        """
        Initialize the transaction simulator.

        Args:
            batch_size: Number of transactions to send in each batch
            delay_seconds: Delay between batches in seconds
            api_url: URL of the prediction API (if None, processes data only)
            sample_size: If provided, use only this fraction of data (0.0-1.0)
        """
        self.batch_size = batch_size
        self.delay_seconds = delay_seconds
        self.api_url = api_url
        self.sample_size = sample_size

    def load_data(self) -> pd.DataFrame:
        """Load transaction data from database."""
        try:
            logger.info("Loading data from database")
            return read_fraud_data(sample_size=self.sample_size)
        except Exception as e:
            logger.error(f"Failed to load data from database: {e}")
            raise

    def preprocess_transaction(self, transaction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Preprocess a transaction before sending.

        Args:
            transaction: Transaction data as a dictionary

        Returns:
            Preprocessed transaction or None if transaction is invalid
        """
        # Validate transaction type
        valid_types = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN']
        if 'type' in transaction and transaction['type'] not in valid_types:
            logger.warning(f"Skipping transaction with invalid type: {transaction.get('type')}")
            return None

        # Convert numeric values to appropriate types
        for key in ['amount', 'oldbalanceOrg', 'newbalanceOrig', 
                   'oldbalanceDest', 'newbalanceDest']:
            if key in transaction:
                try:
                    transaction[key] = float(transaction[key])
                except (ValueError, TypeError):
                    logger.warning(f"Invalid numeric value for {key}: {transaction.get(key)}")
                    return None

        # Convert boolean flags
        for key in ['isFraud', 'isFlaggedFraud']:
            if key in transaction:
                try:
                    transaction[key] = bool(int(transaction[key]))
                except (ValueError, TypeError):
                    logger.warning(f"Invalid boolean value for {key}: {transaction.get(key)}")
                    return None

        # Add timestamp
        transaction['timestamp'] = time.time()

        return transaction

    def send_transaction_to_api(self, transaction: Dict[str, Any]) -> None:
        """
        Send a single transaction to the API.

        Args:
            transaction: Transaction data to send
        """
        try:
            # Send the transaction to the API
            response = requests.post(self.api_url, json=transaction)

            if response.status_code == 200:
                logger.debug(f"Transaction sent to API: {transaction.get('nameOrig')}")
            else:
                logger.error(f"Failed to send transaction to API: {response.status_code} - {response.text}")

        except Exception as e:
            logger.error(f"Failed to send transaction to API: {e}")

    def process_transaction(self, transaction: Dict[str, Any]) -> None:
        """
        Process a single transaction from CSV data.

        Args:
            transaction: Transaction data to process
        """
        try:
            # Create a transaction record
            transaction_id = f"{transaction.get('nameOrig', 'unknown')}-{time.time()}"

            # Log the transaction
            logger.debug(f"Processing transaction from CSV: {transaction_id}")

            # Here you can add any additional processing logic for the transaction
            # without inserting it into a database

        except Exception as e:
            logger.error(f"Failed to process transaction: {e}")

    def simulate_transactions(self, limit: Optional[int] = None) -> None:
        """
        Simulate transactions by sending them to the API or processing from CSV.

        Args:
            limit: Optional limit on the number of transactions to simulate
        """
        try:
            # Load data
            logger.info("Loading data from database - this may take some time for large datasets...")
            df = self.load_data()

            # Limit the number of transactions if specified
            if limit:
                df = df.head(limit)

            total_transactions = len(df)
            logger.info(f"Starting simulation with {total_transactions} transactions")
            logger.info(f"Using batch size of {self.batch_size} with {self.delay_seconds}s delay between batches")
            logger.info(f"Estimated time to complete: {(total_transactions/self.batch_size*self.delay_seconds/60):.2f} minutes")

            # Process in batches
            last_progress_time = time.time()
            progress_interval = 5  # Log progress every 5 seconds

            for i in range(0, total_transactions, self.batch_size):
                batch = df.iloc[i:min(i+self.batch_size, total_transactions)]
                batch_start_time = time.time()

                # Log the start of a new batch
                batch_num = i // self.batch_size + 1
                total_batches = (total_transactions + self.batch_size - 1) // self.batch_size
                logger.info(f"Processing batch {batch_num}/{total_batches}...")

                processed_in_batch = 0
                for _, row in batch.iterrows():
                    # Convert row to dictionary and preprocess
                    transaction = row.to_dict()
                    processed_transaction = self.preprocess_transaction(transaction)

                    # Only process valid transactions
                    if processed_transaction:
                        # Send to API or process from CSV
                        if self.api_url:
                            self.send_transaction_to_api(processed_transaction)
                        else:
                            self.process_transaction(processed_transaction)
                    else:
                        logger.debug("Skipped invalid transaction")

                    processed_in_batch += 1

                    # Provide more frequent progress updates for large batches
                    current_time = time.time()
                    if current_time - last_progress_time > progress_interval:
                        processed = i + processed_in_batch
                        percent_complete = (processed / total_transactions) * 100
                        elapsed_time = current_time - batch_start_time
                        logger.info(f"In progress: {processed}/{total_transactions} transactions ({percent_complete:.2f}%)")
                        last_progress_time = current_time

                # Log progress after batch completion
                processed = min(i + self.batch_size, total_transactions)
                percent_complete = (processed / total_transactions) * 100
                logger.info(f"Processed {processed}/{total_transactions} transactions ({percent_complete:.2f}%)")

                # Delay between batches
                time.sleep(self.delay_seconds)

            logger.info("Transaction simulation completed")

        except Exception as e:
            logger.error(f"Error during transaction simulation: {e}")

def main():
    """Main function to run the transaction simulator."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Simulate financial transactions')
    parser.add_argument('--batch-size', type=int, default=1000, 
                        help='Batch size (default: 1000, increase for faster processing of large datasets)')
    parser.add_argument('--delay', type=float, default=0.5, 
                        help='Delay between batches in seconds (default: 0.5, decrease for faster processing)')
    parser.add_argument('--limit', type=int, default=None, 
                        help='Limit number of transactions (use this for testing with a smaller dataset)')
    parser.add_argument('--api', default=None, 
                        help='API URL (e.g., http://localhost:8002/predict)')
    parser.add_argument('--sample-size', type=float, default=None, 
                        help='Fraction of data to use (0.0-1.0, e.g., 0.01 for 1% of data)')

    args = parser.parse_args()

    # Create and run simulator
    simulator = TransactionSimulator(
        batch_size=args.batch_size,
        delay_seconds=args.delay,
        api_url=args.api,
        sample_size=args.sample_size
    )

    # Warn if processing full dataset without limits
    if args.sample_size is None and args.limit is None:
        logger.warning("No sample_size or limit specified - processing the entire dataset may take a long time.")
        logger.warning("For testing, consider using --sample-size=0.01 (1% of data) or --limit=1000")
        logger.warning("For faster processing, increase --batch-size or decrease --delay")

        # Ask for confirmation if in interactive mode
        import sys
        if sys.stdin.isatty():  # Check if running in interactive terminal
            confirmation = input("Continue with full dataset? (y/n): ")
            if confirmation.lower() != 'y':
                logger.info("Simulation cancelled by user")
                return

    simulator.simulate_transactions(limit=args.limit)

if __name__ == "__main__":
    main()
