import os
import logging
import argparse
import socket
from dotenv import load_dotenv
from db_models import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fraud_model import FraudModel
from data_simulator import TransactionSimulator
from predict import app as predict_app

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    try:
        logger.info("Initializing database on startup...")
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

    yield

    logger.info("Shutting down application...")

app = FastAPI(
    title="TrustNet AI Fraud Detection API",
    description="API for real-time fraud detection in financial transactions",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "TrustNet API is running"}

app.include_router(predict_app, prefix="")

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(start_port=8000, max_port=8100):
    for port in range(start_port, max_port + 1):
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"No available ports in range {start_port}-{max_port}")

def simulate_transactions(batch_size=100, delay_seconds=0.5, limit=None, api_url=None, sample_size=None):
    if api_url is None:
        api_url = os.getenv("API_URL", "http://localhost:8002/predict")

    logger.info("Simulating transactions with data from database")
    logger.info(f"Sending transactions to API at {api_url}")

    simulator = TransactionSimulator(
        batch_size=batch_size,
        delay_seconds=delay_seconds,
        api_url=api_url,
        sample_size=sample_size
    )

    try:
        simulator.simulate_transactions(limit=limit)
        logger.info("Transaction simulation completed")
    except Exception as e:
        logger.error(f"Error during transaction simulation: {e}")
        raise

def train_model(model_dir=None, sample_size=0.3, use_float32=True, memory_efficient=True, full_data=False):
    if model_dir is None:
        model_dir = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"))

    sample_size = None if full_data else sample_size

    logger.info("Training model with data from database")
    logger.info(f"Model will be saved to {model_dir}")

    fraud_model = FraudModel(
        model_dir=model_dir,
        test_size=0.2,
        random_state=42,
        sample_size=sample_size,
        use_float32=use_float32,
        memory_efficient=memory_efficient
    )

    try:
        result = fraud_model.train_and_save()
        logger.info(f"Model training completed. Model saved to {result['model_path']}")
        logger.info(f"Model ROC AUC Score: {result['metrics']['roc_auc_score']:.4f}")
        return result
    except Exception as e:
        logger.error(f"Error during model training: {e}")
        raise

def main(train=False, simulate=False, model_dir=None, sample_size=0.3, 
         use_float32=True, memory_efficient=True, full_data=False,
         batch_size=100, delay_seconds=0.5, limit=None, api_url=None):
    try:
        if train:
            train_model(
                model_dir=model_dir,
                sample_size=sample_size,
                use_float32=use_float32,
                memory_efficient=memory_efficient,
                full_data=full_data
            )

        if simulate:
            simulate_transactions(
                batch_size=batch_size,
                delay_seconds=delay_seconds,
                limit=limit,
                api_url=api_url,
                sample_size=sample_size
            )

        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully.")

        logger.info(f"Database URL: {os.getenv('DATABASE_URL')}")
        logger.info(f"Model directory: {os.getenv('MODEL_DIR')}")

    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='TrustNet AI Fraud Detection')

    parser.add_argument('--train', action='store_true', help='Train the model before starting the server')
    parser.add_argument('--model-dir', default=None, help='Directory to save model')
    parser.add_argument('--sample-size', type=float, default=0.3, help='Fraction of data to use (0.0-1.0)')
    parser.add_argument('--use-float32', action='store_true', default=True, help='Use float32 instead of float64')
    parser.add_argument('--memory-efficient', action='store_true', default=True, help='Use memory-efficient approaches')
    parser.add_argument('--full-data', action='store_true', help='Use full dataset (overrides sample-size)')

    parser.add_argument('--simulate', action='store_true', help='Simulate transactions after starting the server')
    parser.add_argument('--batch-size', type=int, default=100, help='Number of transactions to send in each batch')
    parser.add_argument('--delay', type=float, default=0.5, help='Delay between batches in seconds')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of transactions to simulate')
    parser.add_argument('--api-url', default=None, help='URL of the prediction API')

    parser.add_argument('--no-server', action='store_true', help='Do not start the server after initialization')

    args = parser.parse_args()
    main(
        train=args.train,
        simulate=args.simulate,
        model_dir=args.model_dir,
        sample_size=args.sample_size,
        use_float32=args.use_float32,
        memory_efficient=args.memory_efficient,
        full_data=args.full_data,
        batch_size=args.batch_size,
        delay_seconds=args.delay,
        limit=args.limit,
        api_url=args.api_url
    )

    if not args.no_server:
        if args.simulate:
            import threading
            import time

            def run_simulation():
                time.sleep(5)

                api_url = args.api_url
                if api_url is None:
                    api_url = "http://localhost:8002/predict"

                simulate_transactions(
                    batch_size=args.batch_size,
                    delay_seconds=args.delay,
                    limit=args.limit,
                    api_url=api_url,
                    sample_size=args.sample_size
                )

            simulation_thread = threading.Thread(target=run_simulation)
            simulation_thread.daemon = True
            simulation_thread.start()

            logger.info("Starting server with simulation...")
        else:
            logger.info("Starting server...")

        import uvicorn

        port = 8002

        logger.info(f"✅ Server is running at: http://127.0.0.1:{port}")
        uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)

# Project by Jeet Singh Saini
