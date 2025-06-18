import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Badge, 
  Alert, 
  Button,
  Table
} from 'react-bootstrap';
import { 
  FaArrowLeft, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaExchangeAlt,
  FaUser,
  FaCalendarAlt,
  FaMoneyBillWave
} from 'react-icons/fa';
import { getTransaction } from '../services/api';
import './TransactionDetail.css';

const TransactionDetail = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);

        // Fetch transaction details using our API service
        const response = await getTransaction(id);
        setTransaction(response.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching transaction details:', err);
        setError('Failed to load transaction details. Please try again later.');
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading transaction details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-4">
        <FaExclamationTriangle className="me-2" />
        {error}
      </Alert>
    );
  }

  if (!transaction) {
    return (
      <Alert variant="warning" className="my-4">
        <FaExclamationTriangle className="me-2" />
        Transaction not found. The transaction may have been deleted or you may have entered an invalid ID.
        <div className="mt-3">
          <Link to="/transactions" className="btn btn-primary">
            <FaArrowLeft className="me-2" /> Back to Transactions
          </Link>
        </div>
      </Alert>
    );
  }

  // Format date
  const formattedDate = new Date(transaction.timestamp).toLocaleString();

  // Determine status color and icon
  const statusColor = transaction.is_fraud ? 'danger' : 'success';
  const StatusIcon = transaction.is_fraud ? FaExclamationTriangle : FaCheckCircle;

  // Format explanation data for SHAP visualization
  const explanationData = transaction.explanation || [];

  return (
    <div className="transaction-detail">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Transaction Details</h1>
        <Link to="/transactions" className="btn btn-outline-primary">
          <FaArrowLeft className="me-2" /> Back to Transactions
        </Link>
      </div>

      {/* Status Alert */}
      <Alert variant={statusColor} className="status-alert">
        <div className="d-flex align-items-center">
          <StatusIcon className="me-3 status-icon" />
          <div>
            <h4 className="alert-heading mb-1">
              {transaction.is_fraud ? 'Fraudulent Transaction Detected' : 'Legitimate Transaction'}
            </h4>
            <p className="mb-0">
              {transaction.is_fraud 
                ? `This transaction has been flagged as potentially fraudulent with ${(transaction.fraud_probability * 100).toFixed(2)}% confidence.` 
                : 'This transaction appears to be legitimate and has not been flagged by our fraud detection system.'}
            </p>
          </div>
        </div>
      </Alert>

      {/* Transaction Overview */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card className="mb-4 mb-lg-0">
            <Card.Header>Transaction Overview</Card.Header>
            <Card.Body>
              <div className="detail-item">
                <div className="detail-label">
                  <FaExchangeAlt className="me-2" /> Transaction Type
                </div>
                <div className="detail-value">
                  <Badge bg="info">{transaction.transaction_type}</Badge>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <FaMoneyBillWave className="me-2" /> Amount
                </div>
                <div className="detail-value">
                  ${transaction.amount.toLocaleString()}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <FaCalendarAlt className="me-2" /> Timestamp
                </div>
                <div className="detail-value">
                  {formattedDate}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <FaUser className="me-2" /> Origin Account
                </div>
                <div className="detail-value">
                  {transaction.name_orig}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <FaUser className="me-2" /> Destination Account
                </div>
                <div className="detail-value">
                  {transaction.name_dest}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  Transaction ID
                </div>
                <div className="detail-value id-value">
                  {transaction.transaction_id}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header>Balance Information</Card.Header>
            <Card.Body>
              <Table bordered className="balance-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Before Transaction</th>
                    <th>After Transaction</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Origin Account</strong></td>
                    <td>${transaction.old_balance_orig.toLocaleString()}</td>
                    <td>${transaction.new_balance_orig.toLocaleString()}</td>
                    <td className="text-danger">
                      -${(transaction.old_balance_orig - transaction.new_balance_orig).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Destination Account</strong></td>
                    <td>${transaction.old_balance_dest.toLocaleString()}</td>
                    <td>${transaction.new_balance_dest.toLocaleString()}</td>
                    <td className="text-success">
                      +${(transaction.new_balance_dest - transaction.old_balance_dest).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </Table>

              <div className="risk-assessment mt-4">
                <h5>Risk Assessment</h5>
                <div className="risk-score-container">
                  <div className="risk-label">Fraud Probability</div>
                  <div className="risk-score">
                    <div 
                      className="risk-indicator" 
                      style={{ 
                        width: `${transaction.fraud_probability * 100}%`,
                        backgroundColor: transaction.is_fraud ? 'var(--danger-color)' : 'var(--success-color)'
                      }}
                    ></div>
                    <span>{(transaction.fraud_probability * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SHAP Explanation (only for fraudulent transactions) */}
      {transaction.is_fraud && explanationData.length > 0 && (
        <Card className="mb-4">
          <Card.Header>Fraud Detection Explanation</Card.Header>
          <Card.Body>
            <p className="explanation-intro">
              The following features contributed most significantly to this transaction being flagged as potentially fraudulent:
            </p>

            <div className="shap-explanation">
              {explanationData.map((item, index) => (
                <div key={index} className="shap-item">
                  <div className="shap-feature">
                    <span className="feature-name">{item.feature}</span>
                    <span className="feature-value">Value: {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}</span>
                  </div>
                  <div className="shap-impact-container">
                    <div 
                      className={`shap-bar ${item.impact >= 0 ? 'shap-positive' : 'shap-negative'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(item.impact) * 100, 100)}%`,
                        marginLeft: item.impact < 0 ? 'auto' : '0'
                      }}
                    ></div>
                    <span className="impact-value">{item.impact.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="explanation-footer mt-4">
              <p>
                <strong>How to interpret:</strong> Positive values (green) indicate features that increase the likelihood of fraud, 
                while negative values (red) decrease it. The length of each bar represents the magnitude of impact.
              </p>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <Card.Header>Actions</Card.Header>
        <Card.Body>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-secondary">
              Download Transaction Details
            </Button>
            {transaction.is_fraud && (
              <>
                <Button variant="danger">
                  <FaExclamationTriangle className="me-2" /> Mark as Confirmed Fraud
                </Button>
                <Button variant="success">
                  <FaCheckCircle className="me-2" /> Mark as False Positive
                </Button>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TransactionDetail;
