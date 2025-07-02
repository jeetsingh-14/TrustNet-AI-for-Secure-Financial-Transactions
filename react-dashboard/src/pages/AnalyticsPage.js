import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Badge, 
  Form, 
  Button,
  Alert,
  Dropdown
} from 'react-bootstrap';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler,
  ScatterController
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';
import { FaChartLine, FaChartBar, FaChartPie, FaFilter, FaInfoCircle } from 'react-icons/fa';
import { getTransactions, getAlerts, getStats } from '../services/api';
import FraudHeatmap from '../components/FraudHeatmap';
import AnomalyTimeline from '../components/AnomalyTimeline';
import { InsightCard } from '../components/common';
import './AnalyticsPage.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
);

const AnalyticsPage = () => {
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    fraudulentTransactions: 0,
    fraudRate: 0,
    averageFraudProbability: 0,
    totalAmount: 0,
    fraudAmount: 0
  });

  const [timeSeriesData, setTimeSeriesData] = useState({
    labels: [],
    transactions: [],
    fraudTransactions: []
  });

  const [transactionTypeData, setTransactionTypeData] = useState({
    labels: [],
    legitimate: [],
    fraudulent: []
  });

  const [topFeatures, setTopFeatures] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Model evaluation metrics
  const [rocCurveData, setRocCurveData] = useState({
    labels: [],
    datasets: []
  });

  const [prCurveData, setPrCurveData] = useState({
    labels: [],
    datasets: []
  });

  // LIME explanation examples
  const [fraudExamples, setFraudExamples] = useState([]);
  const [selectedFraudExample, setSelectedFraudExample] = useState(null);

  // Date range filter
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    // Define the fetchAnalyticsData function inside useEffect
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);

        // Fetch transactions for metrics calculation using our API service
        const transactionsResponse = await getTransactions({
          limit: 1000,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        });

        const transactions = transactionsResponse.data;

        // Try to get stats from the API
        try {
          const statsResponse = await getStats();
          const statsData = statsResponse.data;

          setMetrics({
            totalTransactions: statsData.total_transactions || 0,
            fraudulentTransactions: statsData.total_frauds || 0,
            fraudRate: statsData.fraud_rate || 0,
            averageFraudProbability: statsData.avg_fraud_probability || 0,
            totalAmount: statsData.total_amount || 0,
            fraudAmount: statsData.fraud_amount || 0
          });
        } catch (statsError) {
          console.error('Error fetching stats, calculating from transactions:', statsError);

          // Calculate metrics from transactions if the stats endpoint fails
          const totalTransactions = transactions.length;
          const fraudulentTransactions = transactions.filter(t => t.is_fraud).length;
          const fraudRate = totalTransactions > 0 ? (fraudulentTransactions / totalTransactions) * 100 : 0;

          const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
          const fraudAmount = transactions
            .filter(t => t.is_fraud)
            .reduce((sum, t) => sum + t.amount, 0);

          const fraudProbabilities = transactions
            .filter(t => t.is_fraud)
            .map(t => t.fraud_probability);

          const averageFraudProbability = fraudProbabilities.length > 0
            ? fraudProbabilities.reduce((sum, p) => sum + p, 0) / fraudProbabilities.length
            : 0;

          setMetrics({
            totalTransactions,
            fraudulentTransactions,
            fraudRate,
            averageFraudProbability,
            totalAmount,
            fraudAmount
          });
        }

        // Generate time series data
        const timeSeriesMap = new Map();
        const today = new Date();

        // Initialize with the last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          timeSeriesMap.set(dateStr, { total: 0, fraud: 0 });
        }

        // Fill with actual data
        transactions.forEach(transaction => {
          const date = new Date(transaction.timestamp).toISOString().split('T')[0];
          if (!timeSeriesMap.has(date)) {
            timeSeriesMap.set(date, { total: 0, fraud: 0 });
          }

          const data = timeSeriesMap.get(date);
          data.total += 1;
          if (transaction.is_fraud) {
            data.fraud += 1;
          }
        });

        // Sort by date
        const sortedTimeSeries = [...timeSeriesMap.entries()].sort((a, b) => 
          new Date(a[0]) - new Date(b[0])
        );

        setTimeSeriesData({
          labels: sortedTimeSeries.map(([date]) => date),
          transactions: sortedTimeSeries.map(([, data]) => data.total),
          fraudTransactions: sortedTimeSeries.map(([, data]) => data.fraud)
        });

        // Generate transaction type data
        const typeMap = new Map();

        transactions.forEach(transaction => {
          const type = transaction.transaction_type;
          if (!typeMap.has(type)) {
            typeMap.set(type, { legitimate: 0, fraudulent: 0 });
          }

          const data = typeMap.get(type);
          if (transaction.is_fraud) {
            data.fraudulent += 1;
          } else {
            data.legitimate += 1;
          }
        });

        setTransactionTypeData({
          labels: [...typeMap.keys()],
          legitimate: [...typeMap.values()].map(data => data.legitimate),
          fraudulent: [...typeMap.values()].map(data => data.fraudulent)
        });

        // Fetch top features (in a real app, this would come from the backend)
        // Here we'll simulate it
        setTopFeatures([
          { feature: 'transactionRatio', importance: 0.32 },
          { feature: 'origBalanceDiffEqualsAmount', importance: 0.28 },
          { feature: 'destBalanceDiffEqualsAmount', importance: 0.15 },
          { feature: 'origNewBalanceIsZero', importance: 0.12 },
          { feature: 'amount', importance: 0.08 },
          { feature: 'destAccountType', importance: 0.05 }
        ]);

        // Fetch recent alerts using our API service
        const alertsResponse = await getAlerts();
        setRecentAlerts(alertsResponse.data.slice(0, 10)); // Get 10 recent alerts

        // Generate dummy ROC curve data (in a real app, this would come from the backend)
        const rocPoints = [
          { x: 0, y: 0 },
          { x: 0.1, y: 0.4 },
          { x: 0.2, y: 0.6 },
          { x: 0.3, y: 0.7 },
          { x: 0.4, y: 0.8 },
          { x: 0.6, y: 0.9 },
          { x: 0.8, y: 0.95 },
          { x: 1, y: 1 }
        ];

        setRocCurveData({
          datasets: [
            {
              label: 'ROC Curve (AUC = 0.85)',
              data: rocPoints,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              pointBackgroundColor: 'rgba(75, 192, 192, 1)',
              pointRadius: 4,
              showLine: true,
              fill: true
            },
            {
              label: 'Random Classifier',
              data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              borderColor: 'rgba(200, 200, 200, 1)',
              borderDash: [5, 5],
              pointRadius: 0,
              showLine: true,
              fill: false
            }
          ]
        });

        // Generate dummy Precision-Recall curve data
        const prPoints = [
          { x: 1, y: 0.1 },
          { x: 0.9, y: 0.3 },
          { x: 0.8, y: 0.5 },
          { x: 0.7, y: 0.65 },
          { x: 0.6, y: 0.75 },
          { x: 0.4, y: 0.85 },
          { x: 0.2, y: 0.92 },
          { x: 0.1, y: 0.97 }
        ];

        setPrCurveData({
          datasets: [
            {
              label: 'Precision-Recall Curve (AP = 0.78)',
              data: prPoints,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              pointBackgroundColor: 'rgba(255, 99, 132, 1)',
              pointRadius: 4,
              showLine: true,
              fill: true
            }
          ]
        });

        // Generate dummy fraud examples with LIME explanations
        const dummyFraudExamples = [
          {
            id: 1,
            transaction_id: 'TX123456789',
            amount: 5000,
            transaction_type: 'TRANSFER',
            fraud_probability: 0.92,
            explanation: [
              { feature: 'amount', value: 5000, impact: 0.45 },
              { feature: 'origNewBalanceIsZero', value: 'True', impact: 0.32 },
              { feature: 'transactionRatio', value: 1.0, impact: 0.15 },
              { feature: 'destAccountAge', value: 2, impact: -0.08 }
            ]
          },
          {
            id: 2,
            transaction_id: 'TX987654321',
            amount: 3500,
            transaction_type: 'CASH_OUT',
            fraud_probability: 0.87,
            explanation: [
              { feature: 'transactionRatio', value: 0.95, impact: 0.38 },
              { feature: 'destBalanceDiffEqualsAmount', value: 'True', impact: 0.29 },
              { feature: 'amount', value: 3500, impact: 0.22 },
              { feature: 'accountActivity', value: 'Low', impact: 0.11 }
            ]
          },
          {
            id: 3,
            transaction_id: 'TX456789123',
            amount: 8200,
            transaction_type: 'PAYMENT',
            fraud_probability: 0.95,
            explanation: [
              { feature: 'amount', value: 8200, impact: 0.51 },
              { feature: 'origBalanceDiffEqualsAmount', value: 'True', impact: 0.25 },
              { feature: 'destAccountType', value: 'New', impact: 0.18 },
              { feature: 'transactionTime', value: '3:15 AM', impact: 0.06 }
            ]
          }
        ];

        setFraudExamples(dummyFraudExamples);
        setSelectedFraudExample(dummyFraudExamples[0]); // Select the first example by default

        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [dateRange]);

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyDateFilter = () => {
    // Update dateRange state with current values to trigger useEffect
    setDateRange(prev => ({...prev}));
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-4">
        {error}
      </Alert>
    );
  }

  // Chart options and data
  const timeSeriesOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Transaction Volume Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const timeSeriesChartData = {
    labels: timeSeriesData.labels,
    datasets: [
      {
        label: 'All Transactions',
        data: timeSeriesData.transactions,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Fraudulent Transactions',
        data: timeSeriesData.fraudTransactions,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const transactionTypeOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Transactions by Type',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked: true,
      },
      x: {
        stacked: true,
      },
    },
  };

  const transactionTypeChartData = {
    labels: transactionTypeData.labels,
    datasets: [
      {
        label: 'Legitimate',
        data: transactionTypeData.legitimate,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Fraudulent',
        data: transactionTypeData.fraudulent,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const featureImportanceOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Feature Importance',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 1,
      },
    },
  };

  const featureImportanceData = {
    labels: topFeatures.map(f => f.feature),
    datasets: [
      {
        data: topFeatures.map(f => f.importance),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
      },
    ],
  };

  const fraudDistributionData = {
    labels: ['Legitimate', 'Fraudulent'],
    datasets: [
      {
        data: [
          metrics.totalTransactions - metrics.fraudulentTransactions,
          metrics.fraudulentTransactions
        ],
        backgroundColor: [
          'rgba(53, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgb(53, 162, 235)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="analytics-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Analytics & Model Explainability</h1>

        <div className="flex flex-wrap items-end space-x-4 px-6">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">From</label>
            <Form.Control
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              className="rounded border px-2 py-1"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">To</label>
            <Form.Control
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              className="rounded border px-2 py-1"
            />
          </div>
          <Button 
            className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 transition-all"
            onClick={applyDateFilter}
          >
            🔍 Apply
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 mt-8">
        <InsightCard 
          icon="📊" 
          title="Transaction Volume" 
          value={metrics.totalTransactions.toLocaleString()} 
          subtitle={`${metrics.fraudulentTransactions.toLocaleString()} Fraudulent (${metrics.fraudRate.toFixed(2)}%)`} 
        />

        <InsightCard 
          icon="📈" 
          title="Fraud Probability" 
          value={`${(metrics.averageFraudProbability * 100).toFixed(2)}%`} 
          subtitle={`Based on ${metrics.fraudulentTransactions.toLocaleString()} flagged transactions`} 
        />

        <InsightCard 
          icon="💵" 
          title="Transaction Amount" 
          value={`$${metrics.totalAmount.toLocaleString()}`} 
          subtitle={`$${metrics.fraudAmount.toLocaleString()} in Fraudulent Transactions`} 
        />

        <InsightCard 
          icon="🛡️" 
          title="Model Accuracy" 
          value="98.7%" 
          subtitle="Based on recent validation data" 
        />
      </div>

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>Transaction Trends</Card.Header>
            <Card.Body>
              <Line options={timeSeriesOptions} data={timeSeriesChartData} />
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Transactions by Type</Card.Header>
            <Card.Body>
              <Bar options={transactionTypeOptions} data={transactionTypeChartData} />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>Fraud Distribution</Card.Header>
            <Card.Body>
              <div className="pie-chart-container">
                <Pie data={fraudDistributionData} />
              </div>
              <div className="text-center mt-3">
                <div className="fraud-rate-label">Fraud Rate</div>
                <div className="fraud-rate-value">{metrics.fraudRate.toFixed(2)}%</div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Feature Importance</Card.Header>
            <Card.Body>
              <Bar options={featureImportanceOptions} data={featureImportanceData} />
              <div className="feature-explanation mt-3">
                <p className="text-muted">
                  These features have the highest impact on the model's fraud predictions.
                  Higher values indicate stronger influence on the model's decision.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fraud Risk Heatmap */}
      <FraudHeatmap />

      {/* Anomaly Timeline */}
      <AnomalyTimeline />


      {/* Model Evaluation */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>ROC Curve</Card.Header>
            <Card.Body>
              <div className="chart-container">
                <Scatter 
                  data={rocCurveData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'False Positive Rate'
                        },
                        min: 0,
                        max: 1
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'True Positive Rate'
                        },
                        min: 0,
                        max: 1
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `FPR: ${context.parsed.x.toFixed(2)}, TPR: ${context.parsed.y.toFixed(2)}`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="text-center mt-3">
                <p className="text-muted">
                  The ROC curve shows the trade-off between true positive rate and false positive rate at different threshold settings.
                  The area under the curve (AUC) is a measure of model performance.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Precision-Recall Curve</Card.Header>
            <Card.Body>
              <div className="chart-container">
                <Scatter 
                  data={prCurveData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Recall'
                        },
                        min: 0,
                        max: 1
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Precision'
                        },
                        min: 0,
                        max: 1
                      }
                    },
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `Recall: ${context.parsed.x.toFixed(2)}, Precision: ${context.parsed.y.toFixed(2)}`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="text-center mt-3">
                <p className="text-muted">
                  The Precision-Recall curve shows the trade-off between precision and recall at different threshold settings.
                  This is particularly useful for imbalanced datasets like fraud detection.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* LIME Explanation */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <FaInfoCircle className="me-2" /> Fraud Explanation (LIME)
          </div>
          <Dropdown>
            <Dropdown.Toggle variant="outline-primary" id="fraud-example-dropdown">
              Select Fraud Example
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {fraudExamples.map(example => (
                <Dropdown.Item 
                  key={example.id} 
                  onClick={() => setSelectedFraudExample(example)}
                  active={selectedFraudExample?.id === example.id}
                >
                  {example.transaction_type} - ${example.amount.toLocaleString()} ({(example.fraud_probability * 100).toFixed(0)}% Risk)
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Card.Header>
        <Card.Body>
          {selectedFraudExample ? (
            <>
              <div className="fraud-example-header mb-3">
                <h5>Transaction {selectedFraudExample.transaction_id}</h5>
                <div className="fraud-example-details">
                  <Badge bg="primary" className="me-2">{selectedFraudExample.transaction_type}</Badge>
                  <span className="me-3">Amount: ${selectedFraudExample.amount.toLocaleString()}</span>
                  <span>Fraud Probability: {(selectedFraudExample.fraud_probability * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div className="explanation-intro mb-3">
                <p>
                  The following features contributed most significantly to this transaction being flagged as potentially fraudulent:
                </p>
              </div>

              <div className="shap-explanation">
                {selectedFraudExample.explanation.map((item, index) => (
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
            </>
          ) : (
            <p className="text-center">No fraud example selected.</p>
          )}
        </Card.Body>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <Card.Header>Recent Fraud Alerts</Card.Header>
        <Card.Body>
          {recentAlerts.length > 0 ? (
            <Table hover responsive className="alerts-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map(alert => (
                  <tr key={alert.id}>
                    <td>{alert.transaction_id.substring(0, 10)}...</td>
                    <td>{new Date(alert.timestamp).toLocaleString()}</td>
                    <td>
                      ${alert.transaction?.amount?.toLocaleString() || 'N/A'}
                    </td>
                    <td>
                      <div className="risk-score">
                        <div 
                          className="risk-indicator" 
                          style={{ width: `${alert.fraud_probability * 100}%` }}
                        ></div>
                        <span>{(alert.fraud_probability * 100).toFixed(2)}%</span>
                      </div>
                    </td>
                    <td>
                      {alert.is_reviewed ? (
                        <Badge bg="secondary">Reviewed</Badge>
                      ) : (
                        <Badge bg="warning">Pending</Badge>
                      )}
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => window.location.href = `/transactions/${alert.transaction_id}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-center">No recent alerts found.</p>
          )}
        </Card.Body>
      </Card>

      {/* Coming Soon Section */}
      <Card className="mt-5 mb-4">
        <Card.Header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h5 className="mb-0">Coming Soon - Advanced Analytics Features</h5>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-blue-500 text-2xl mb-2">📊</div>
              <h5 className="text-gray-700 font-semibold">Model Drift Score</h5>
              <p className="text-gray-600 text-sm">Monitor your model's performance over time and get alerts when drift is detected.</p>
              <Badge bg="secondary" className="mt-2">Coming Q3 2023</Badge>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-blue-500 text-2xl mb-2">🧠</div>
              <h5 className="text-gray-700 font-semibold">Explainable AI Breakdown</h5>
              <p className="text-gray-600 text-sm">Detailed SHAP values and feature importance for each transaction prediction.</p>
              <Badge bg="secondary" className="mt-2">Coming Q3 2023</Badge>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-blue-500 text-2xl mb-2">📈</div>
              <h5 className="text-gray-700 font-semibold">Alert Threshold Graph</h5>
              <p className="text-gray-600 text-sm">Interactive tools to set and visualize optimal alert thresholds for your business.</p>
              <Badge bg="secondary" className="mt-2">Coming Q4 2023</Badge>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
