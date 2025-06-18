"""
db_models.py - MySQL schema for transactions and fraud flags.

This module defines the database models for storing transactions and fraud alerts
using SQLAlchemy ORM. It also provides utility functions for database operations.
"""

import os
import pymysql
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from datetime import datetime
from typing import Dict, Any, Optional
import json

# Get database URL from environment variable or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:285project@127.0.0.1:3307/trustnet"
)

# Create SQLAlchemy engine for pymysql compatibility
engine = create_engine(
    DATABASE_URL
)

# Create declarative base
Base = declarative_base()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Transaction(Base):
    """Model for financial transactions."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(255), unique=True, index=True, nullable=False)
    transaction_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    name_orig = Column(String(255), nullable=False)
    old_balance_orig = Column(Float, nullable=False)
    new_balance_orig = Column(Float, nullable=False)
    name_dest = Column(String(255), nullable=False)
    old_balance_dest = Column(Float, nullable=False)
    new_balance_dest = Column(Float, nullable=False)
    is_fraud = Column(Boolean, default=False)
    fraud_probability = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship with FraudAlert
    fraud_alert = relationship("FraudAlert", back_populates="transaction", uselist=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "transaction_type": self.transaction_type,
            "amount": self.amount,
            "name_orig": self.name_orig,
            "old_balance_orig": self.old_balance_orig,
            "new_balance_orig": self.new_balance_orig,
            "name_dest": self.name_dest,
            "old_balance_dest": self.old_balance_dest,
            "new_balance_dest": self.new_balance_dest,
            "is_fraud": self.is_fraud,
            "fraud_probability": self.fraud_probability,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }

class FraudAlert(Base):
    """Model for fraud alerts."""

    __tablename__ = "fraud_alerts"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(255), ForeignKey("transactions.transaction_id"), unique=True, index=True)
    fraud_probability = Column(Float, nullable=False)
    explanation = Column(Text)  # JSON string of LIME explanations
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_reviewed = Column(Boolean, default=False)
    reviewed_by = Column(String(255), nullable=True)
    review_timestamp = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationship with Transaction
    transaction = relationship("Transaction", back_populates="fraud_alert")

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        explanation_dict = []
        if self.explanation:
            try:
                explanation_dict = json.loads(self.explanation)
            except json.JSONDecodeError:
                explanation_dict = []

        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "fraud_probability": self.fraud_probability,
            "explanation": explanation_dict,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "is_reviewed": self.is_reviewed,
            "reviewed_by": self.reviewed_by,
            "review_timestamp": self.review_timestamp.isoformat() if self.review_timestamp else None,
            "review_notes": self.review_notes
        }

def get_db() -> Session:
    """
    Get database session.

    Returns:
        SQLAlchemy Session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_database(db: Session) -> None:
    """
    Seed the database with sample data if it's empty.

    Args:
        db: Database session
    """
    # Check if transactions table is empty
    transaction_count = db.query(Transaction).count()
    if transaction_count == 0:
        print("Seeding database with sample transactions...")

        # Create sample transactions
        sample_transactions = [
            Transaction(
                transaction_id=f"sample-transaction-{i}",
                transaction_type=["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"][i % 5],
                amount=1000.0 * (i + 1),
                name_orig=f"C{1000000 + i}",
                old_balance_orig=10000.0,
                new_balance_orig=10000.0 - (1000.0 * (i + 1)),
                name_dest=f"M{2000000 + i}",
                old_balance_dest=0.0,
                new_balance_dest=1000.0 * (i + 1),
                is_fraud=i % 5 == 1,  # Mark every 5th transaction as fraud
                fraud_probability=0.9 if i % 5 == 1 else 0.1,
                timestamp=datetime.utcnow()
            )
            for i in range(20)  # Create 20 sample transactions
        ]

        # Add transactions to database
        db.add_all(sample_transactions)
        db.commit()

        # Create fraud alerts for fraudulent transactions
        fraud_transactions = db.query(Transaction).filter(Transaction.is_fraud == True).all()

        if fraud_transactions:
            print("Creating fraud alerts for fraudulent transactions...")

            # Create fraud alerts
            fraud_alerts = [
                FraudAlert(
                    transaction_id=transaction.transaction_id,
                    fraud_probability=transaction.fraud_probability,
                    explanation=json.dumps([
                        {"feature": "amount", "value": transaction.amount, "impact": 0.7},
                        {"feature": "transaction_type", "value": 0.0, "impact": 0.2},
                        {"feature": "balance_diff", "value": 0.0, "impact": 0.1}
                    ]),
                    timestamp=transaction.timestamp
                )
                for transaction in fraud_transactions
            ]

            # Add fraud alerts to database
            db.add_all(fraud_alerts)
            db.commit()

        print(f"Database seeded with {len(sample_transactions)} transactions and {len(fraud_transactions)} fraud alerts.")

def init_db() -> None:
    """Initialize database by creating all tables and seed with sample data if empty."""
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed database with sample data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

def get_transaction_by_id(db: Session, transaction_id: str) -> Optional[Transaction]:
    """
    Get transaction by ID.

    Args:
        db: Database session
        transaction_id: Transaction ID

    Returns:
        Transaction or None if not found
    """
    return db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()

def get_fraud_alert_by_transaction_id(db: Session, transaction_id: str) -> Optional[FraudAlert]:
    """
    Get fraud alert by transaction ID.

    Args:
        db: Database session
        transaction_id: Transaction ID

    Returns:
        FraudAlert or None if not found
    """
    return db.query(FraudAlert).filter(FraudAlert.transaction_id == transaction_id).first()

def get_recent_transactions(db: Session, limit: int = 100) -> list:
    """
    Get recent transactions.

    Args:
        db: Database session
        limit: Maximum number of transactions to return

    Returns:
        List of transactions
    """
    return db.query(Transaction).order_by(Transaction.timestamp.desc()).limit(limit).all()

def get_recent_fraud_alerts(db: Session, limit: int = 100) -> list:
    """
    Get recent fraud alerts.

    Args:
        db: Database session
        limit: Maximum number of alerts to return

    Returns:
        List of fraud alerts
    """
    return db.query(FraudAlert).order_by(FraudAlert.timestamp.desc()).limit(limit).all()

def mark_alert_as_reviewed(
    db: Session,
    alert_id: int,
    reviewed_by: str,
    review_notes: Optional[str] = None
) -> Optional[FraudAlert]:
    """
    Mark a fraud alert as reviewed.

    Args:
        db: Database session
        alert_id: Fraud alert ID
        reviewed_by: Username of the reviewer
        review_notes: Optional review notes

    Returns:
        Updated FraudAlert or None if not found
    """
    alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
    if alert:
        alert.is_reviewed = True
        alert.reviewed_by = reviewed_by
        alert.review_timestamp = datetime.utcnow()
        alert.review_notes = review_notes
        db.commit()
        db.refresh(alert)
    return alert

def get_transaction_stats(db: Session) -> Dict[str, Any]:
    """
    Get transaction statistics from the database.

    Args:
        db: Database session

    Returns:
        Dictionary with transaction statistics
    """
    try:
        # Get total number of transactions
        total_transactions = db.query(Transaction).count()

        # Get total number of fraudulent transactions
        total_frauds = db.query(Transaction).filter(Transaction.is_fraud == True).count()

        # Get total amount of all transactions
        from sqlalchemy import func
        total_amount_result = db.query(func.sum(Transaction.amount)).scalar()
        total_amount = float(total_amount_result) if total_amount_result is not None else 0.0

        # Get average fraud probability
        avg_fraud_prob_result = db.query(func.avg(Transaction.fraud_probability)).scalar()
        avg_fraud_probability = float(avg_fraud_prob_result) if avg_fraud_prob_result is not None else 0.0

        # Model accuracy is typically calculated during model evaluation
        # Here we're using a placeholder value
        model_accuracy = 0.95

        return {
            "total_transactions": total_transactions,
            "total_frauds": total_frauds,
            "total_amount": total_amount,
            "avg_fraud_probability": avg_fraud_probability,
            "model_accuracy": model_accuracy
        }
    except Exception as e:
        print(f"Error getting transaction stats: {e}")
        # Return default values in case of error
        return {
            "total_transactions": 0,
            "total_frauds": 0,
            "total_amount": 0.0,
            "avg_fraud_probability": 0.0,
            "model_accuracy": 0.0
        }

if __name__ == "__main__":
    # Initialize database when script is run directly
    init_db()
    print("Database initialized successfully.")
