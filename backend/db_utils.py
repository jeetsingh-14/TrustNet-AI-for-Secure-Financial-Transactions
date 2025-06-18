"""
db_utils.py - Database utility functions for TrustNet AI.

This module provides utility functions for connecting to the MySQL database
and performing common operations like reading data from tables.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from typing import Optional, List, Dict, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection string
DB_URL = 'mysql+pymysql://root:285project@127.0.0.1:3307/trustnet'

def get_db_engine():
    """
    Create and return a SQLAlchemy engine for database operations.

    Returns:
        SQLAlchemy engine object
    """
    try:
        engine = create_engine(
            DB_URL
        )
        logger.info("Database engine created successfully")
        return engine
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        raise

def read_fraud_data(sample_size: Optional[float] = None, random_state: int = 42) -> pd.DataFrame:
    """
    Read fraud detection data from the database.

    Args:
        sample_size: If provided, only a fraction of the data is loaded
        random_state: Random state for reproducibility when sampling

    Returns:
        DataFrame containing the transaction data
    """
    try:
        engine = get_db_engine()

        if sample_size is not None and 0.0 < sample_size < 1.0:
            # Use SQL to sample the data
            query = text(f"""
                SELECT * FROM fraud_detection_data
                ORDER BY RAND({random_state})
                LIMIT :limit
            """)

            # First get the total count
            count_query = text("SELECT COUNT(*) FROM fraud_detection_data")
            with engine.connect() as conn:
                total_count = conn.execute(count_query).scalar()

            # Calculate the sample size
            limit = int(total_count * sample_size)

            # Execute the query with the limit
            logger.info(f"Reading {sample_size:.2%} of data ({limit} rows out of {total_count})")
            df = pd.read_sql(query, engine, params={"limit": limit})
        else:
            # Read the entire table
            logger.info("Reading all data from fraud_detection_data table")
            df = pd.read_sql_table("fraud_detection_data", engine)

        return df
    except Exception as e:
        logger.error(f"Failed to read fraud data from database: {e}")
        raise
