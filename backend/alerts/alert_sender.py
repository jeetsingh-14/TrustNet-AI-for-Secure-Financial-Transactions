"""
alert_sender.py - Slack/email notification for high-risk scores.

This module provides functionality to send real-time alerts for transactions
flagged as potentially fraudulent, using either Slack webhooks or email.
"""

import os
import json
import logging
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AlertSender:
    """Class for sending fraud alerts via Slack or email."""

    def __init__(
        self,
        slack_webhook_url: Optional[str] = None,
        email_config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the alert sender.

        Args:
            slack_webhook_url: URL for Slack webhook
            email_config: Configuration for email alerts
        """
        self.slack_webhook_url = slack_webhook_url or os.getenv("SLACK_WEBHOOK_URL")

        # Email configuration
        self.email_config = email_config or {
            "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "sender_email": os.getenv("SENDER_EMAIL"),
            "sender_password": os.getenv("SENDER_PASSWORD"),
            "recipient_emails": os.getenv("RECIPIENT_EMAILS", "").split(",")
        }

    def send_slack_alert(
        self,
        transaction: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> bool:
        """
        Send a fraud alert to Slack.

        Args:
            transaction: Transaction data
            prediction: Prediction result with fraud probability and explanation

        Returns:
            True if alert was sent successfully, False otherwise
        """
        if not self.slack_webhook_url:
            logger.warning("Slack webhook URL not configured. Skipping Slack alert.")
            return False

        try:
            # Format the message
            message = self._format_slack_message(transaction, prediction)

            # Send to Slack
            response = requests.post(
                self.slack_webhook_url,
                json=message,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                logger.info(f"Slack alert sent successfully for transaction {transaction.get('nameOrig')}")
                return True
            else:
                logger.error(f"Failed to send Slack alert: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error sending Slack alert: {e}")
            return False

    def _format_slack_message(
        self,
        transaction: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Format a Slack message for a fraud alert.

        Args:
            transaction: Transaction data
            prediction: Prediction result

        Returns:
            Formatted Slack message
        """
        # Extract transaction details
        transaction_type = transaction.get("type", "Unknown")
        amount = transaction.get("amount", 0)
        name_orig = transaction.get("nameOrig", "Unknown")
        name_dest = transaction.get("nameDest", "Unknown")

        # Extract prediction details
        fraud_probability = prediction.get("fraud_probability", 0) * 100
        transaction_id = prediction.get("transaction_id", "Unknown")
        explanation = prediction.get("explanation", [])

        # Format explanation text
        explanation_text = ""
        if explanation:
            explanation_text = "\n".join([
                f"• {item.get('feature', 'Unknown')}: Impact = {item.get('impact', 0):.4f}"
                for item in explanation[:5]  # Show top 5 features
            ])

        # Create Slack message
        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 FRAUD ALERT 🚨",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Transaction ID:* {transaction_id}\n*Fraud Probability:* {fraud_probability:.2f}%"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Type:*\n{transaction_type}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Amount:*\n${amount:.2f}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*From:*\n{name_orig}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*To:*\n{name_dest}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Top Contributing Factors:*\n{explanation_text}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "View Details",
                                "emoji": True
                            },
                            "url": f"http://localhost:3000/transactions/{transaction_id}",
                            "value": "view_details"
                        }
                    ]
                }
            ]
        }

    def send_email_alert(
        self,
        transaction: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> bool:
        """
        Send a fraud alert via email.

        Args:
            transaction: Transaction data
            prediction: Prediction result

        Returns:
            True if alert was sent successfully, False otherwise
        """
        sender_email = self.email_config.get("sender_email")
        sender_password = self.email_config.get("sender_password")
        recipient_emails = self.email_config.get("recipient_emails", [])

        if not sender_email or not sender_password or not recipient_emails:
            logger.warning("Email configuration incomplete. Skipping email alert.")
            return False

        try:
            # Create message
            msg = MIMEMultipart()
            msg["Subject"] = "🚨 TrustNet AI Fraud Alert"
            msg["From"] = sender_email
            msg["To"] = ", ".join(recipient_emails)

            # Format email body
            body = self._format_email_body(transaction, prediction)
            msg.attach(MIMEText(body, "html"))

            # Send email
            with smtplib.SMTP(
                self.email_config.get("smtp_server", "smtp.gmail.com"),
                self.email_config.get("smtp_port", 587)
            ) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)

            logger.info(f"Email alert sent successfully for transaction {transaction.get('nameOrig')}")
            return True

        except Exception as e:
            logger.error(f"Error sending email alert: {e}")
            return False

    def _format_email_body(
        self,
        transaction: Dict[str, Any],
        prediction: Dict[str, Any]
    ) -> str:
        """
        Format an email body for a fraud alert.

        Args:
            transaction: Transaction data
            prediction: Prediction result

        Returns:
            Formatted email body as HTML
        """
        # Extract transaction details
        transaction_type = transaction.get("type", "Unknown")
        amount = transaction.get("amount", 0)
        name_orig = transaction.get("nameOrig", "Unknown")
        name_dest = transaction.get("nameDest", "Unknown")

        # Extract prediction details
        fraud_probability = prediction.get("fraud_probability", 0) * 100
        transaction_id = prediction.get("transaction_id", "Unknown")
        explanation = prediction.get("explanation", [])

        # Format explanation HTML
        explanation_html = ""
        if explanation:
            explanation_rows = ""
            for item in explanation[:5]:  # Show top 5 features
                feature = item.get("feature", "Unknown")
                impact = item.get("impact", 0)
                explanation_rows += f"""
                <tr>
                    <td>{feature}</td>
                    <td>{impact:.4f}</td>
                </tr>
                """

            explanation_html = f"""
            <h3>Top Contributing Factors:</h3>
            <table border="1" cellpadding="5" cellspacing="0">
                <tr>
                    <th>Feature</th>
                    <th>Impact</th>
                </tr>
                {explanation_rows}
            </table>
            """

        # Create HTML email
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f44336; color: white; padding: 10px; text-align: center; }}
                .transaction-details {{ margin-top: 20px; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ background-color: #f2f2f2; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; 
                          text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 FRAUD ALERT 🚨</h1>
                </div>

                <div class="transaction-details">
                    <h2>Transaction Details</h2>
                    <p><strong>Transaction ID:</strong> {transaction_id}</p>
                    <p><strong>Fraud Probability:</strong> {fraud_probability:.2f}%</p>

                    <table border="1" cellpadding="5" cellspacing="0">
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>From</th>
                            <th>To</th>
                        </tr>
                        <tr>
                            <td>{transaction_type}</td>
                            <td>${amount:.2f}</td>
                            <td>{name_orig}</td>
                            <td>{name_dest}</td>
                        </tr>
                    </table>

                    {explanation_html}

                    <a href="http://localhost:3000/transactions/{transaction_id}" class="button">View Details</a>
                </div>
            </div>
        </body>
        </html>
        """

    def send_alert(
        self,
        transaction: Dict[str, Any],
        prediction: Dict[str, Any],
        methods: List[str] = ["slack", "email"]
    ) -> Dict[str, bool]:
        """
        Send fraud alert using specified methods.

        Args:
            transaction: Transaction data
            prediction: Prediction result
            methods: List of alert methods to use

        Returns:
            Dictionary with status of each alert method
        """
        results = {}

        if "slack" in methods:
            results["slack"] = self.send_slack_alert(transaction, prediction)

        if "email" in methods:
            results["email"] = self.send_email_alert(transaction, prediction)

        return results

# Poll database for new fraud alerts
def poll_database_for_alerts(
    database_url: str = None,
    interval_seconds: int = 10,
    alert_sender: Optional[AlertSender] = None
) -> None:
    """
    Poll the database for new fraud alerts.

    Args:
        database_url: Database URL
        interval_seconds: Polling interval in seconds
        alert_sender: AlertSender instance
    """
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        from dotenv import load_dotenv
        import os
        import time
        from datetime import datetime, timedelta

        # Load environment variables
        load_dotenv()

        # Get database URL from environment if not provided
        if database_url is None:
            database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/trustnet")

        # Create alert sender if not provided
        if alert_sender is None:
            alert_sender = AlertSender()

        # Create database engine and session
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Track the last alert timestamp
        last_check_time = datetime.now() - timedelta(minutes=5)  # Start by checking alerts from the last 5 minutes

        logger.info(f"Database poller started. Checking for fraud alerts every {interval_seconds} seconds")

        while True:
            try:
                # Create a new session for each check
                db = SessionLocal()

                # Query for new fraud alerts
                query = text("""
                    SELECT 
                        fa.id, fa.transaction_id, fa.fraud_probability, fa.explanation,
                        t.transaction_type, t.amount, t.name_orig, t.name_dest,
                        t.old_balance_orig, t.new_balance_orig, t.old_balance_dest, t.new_balance_dest
                    FROM 
                        fraud_alerts fa
                    JOIN 
                        transactions t ON fa.transaction_id = t.transaction_id
                    WHERE 
                        fa.timestamp > :last_check_time
                        AND fa.is_reviewed = FALSE
                    ORDER BY 
                        fa.timestamp ASC
                """)

                result = db.execute(query, {"last_check_time": last_check_time})

                # Process each new alert
                for row in result:
                    try:
                        # Create transaction and prediction dictionaries
                        transaction = {
                            "type": row.transaction_type,
                            "amount": row.amount,
                            "nameOrig": row.name_orig,
                            "oldbalanceOrg": row.old_balance_orig,
                            "newbalanceOrig": row.new_balance_orig,
                            "nameDest": row.name_dest,
                            "oldbalanceDest": row.old_balance_dest,
                            "newbalanceDest": row.new_balance_dest
                        }

                        prediction = {
                            "transaction_id": row.transaction_id,
                            "fraud_probability": row.fraud_probability,
                            "is_fraud": True,
                            "explanation": json.loads(row.explanation) if row.explanation else []
                        }

                        # Send alert
                        logger.info(f"Fraud detected in transaction {row.transaction_id}. Sending alerts.")
                        alert_sender.send_alert(transaction, prediction)

                    except Exception as e:
                        logger.error(f"Error processing fraud alert {row.transaction_id}: {e}")

                # Update last check time
                last_check_time = datetime.now()

                # Close the session
                db.close()

            except Exception as e:
                logger.error(f"Error polling database: {e}")
                if 'db' in locals():
                    db.close()

            # Wait for the next check
            time.sleep(interval_seconds)

    except ImportError as e:
        logger.error(f"Required package not installed: {e}")
    except Exception as e:
        logger.error(f"Error setting up database poller: {e}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Fraud alert sender')
    parser.add_argument('--db', help='Database URL (defaults to .env DATABASE_URL)')
    parser.add_argument('--interval', type=int, default=10, help='Polling interval in seconds')
    parser.add_argument('--slack-webhook', help='Slack webhook URL')
    parser.add_argument('--email-server', default='smtp.gmail.com', help='SMTP server')
    parser.add_argument('--email-port', type=int, default=587, help='SMTP port')
    parser.add_argument('--email-sender', help='Sender email address')
    parser.add_argument('--email-password', help='Sender email password')
    parser.add_argument('--email-recipients', help='Comma-separated list of recipient email addresses')

    args = parser.parse_args()

    # Create alert sender
    alert_sender = AlertSender(
        slack_webhook_url=args.slack_webhook or os.getenv("SLACK_WEBHOOK_URL"),
        email_config={
            "smtp_server": args.email_server,
            "smtp_port": args.email_port,
            "sender_email": args.email_sender or os.getenv("SENDER_EMAIL"),
            "sender_password": args.email_password or os.getenv("SENDER_PASSWORD"),
            "recipient_emails": (args.email_recipients or os.getenv("RECIPIENT_EMAILS", "")).split(",")
        }
    )

    # Start database poller
    poll_database_for_alerts(
        database_url=args.db,
        interval_seconds=args.interval,
        alert_sender=alert_sender
    )
