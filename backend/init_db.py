"""
init_db.py - Script to initialize the MySQL database and seed it with mock data.

This script uses the init_db function from db_models.py to create the database tables
and populate them with sample data.
"""

import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the init_db function from db_models.py
from db_models import init_db

def main():
    """Initialize the database and seed it with mock data."""
    try:
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

if __name__ == "__main__":
    main()
