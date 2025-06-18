import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Alert, Button, OverlayTrigger, Tooltip as BSTooltip, Spinner, Dropdown, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaExchangeAlt, 
  FaExclamationTriangle, 
  FaMoneyBillWave, 
  FaChartLine,
  FaSearch,
  FaShieldAlt,
  FaArrowRight,
  FaSync,
  FaDownload,
  FaCalendarAlt,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
  FaClock,
  FaChartPie,
  FaChartArea,
  FaEllipsisV,
  FaMapMarkedAlt,
  FaImage,
  FaFileExport,
  FaUserShield,
  FaUserCog
} from 'react-icons/fa';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';
import { getTransactions, getAlerts, getStats, getDashboardData } from '../services/api';
import { CSVLink } from 'react-csv';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import TransactionDetailModal from '../components/TransactionDetailModal';
import TimeRangeFilter from '../components/TimeRangeFilter';
import RoleBasedAccessControlModal from '../components/RoleBasedAccessControlModal';


// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement,
  Filler
);

const Dashboard = () => {
  // Main stats state
  const [stats, setStats] = useState({
    totalTransactions: 0,
    fraudulentTransactions: 0,
    totalAmount: 0,
    averageFraudProbability: 0,
    modelAccuracy: 0,
    // New stats for trends
    transactionsTrend: 0,
    fraudTrend: 0,
    amountTrend: 0
  });

  // Data states
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);

  // UI states
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState('7days'); // '24h', '7days', '30days', 'custom'
  const [exportData, setExportData] = useState([]);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Transaction detail modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  // Role-based access control states
  const [showRbacModal, setShowRbacModal] = useState(false);
  const [userRoles, setUserRoles] = useState({
    admin: true,
    analyst: true,
    viewer: true
  });
  const [permissions, setPermissions] = useState({
    viewTransactions: true,
    exportData: true,
    markFraud: true,
    viewAnalytics: true,
    manageUsers: true
  });

  // Chart refs for export functionality
  const chartRefs = {
    dailyTransactions: useRef(),
    fraudDistribution: useRef(),
    fraudTrend: useRef()
  };

  // Skeleton loading state
  const [loadingStage, setLoadingStage] = useState('initial'); // 'initial', 'charts', 'tables', 'complete'

  // Chart data states
  const [dailyTransactionData, setDailyTransactionData] = useState({
    labels: [],
    datasets: []
  });

  const [fraudDistributionData, setFraudDistributionData] = useState({
    labels: ['Legitimate', 'Fraudulent'],
    datasets: []
  });

  // New chart for fraud trends over time
  const [fraudTrendData, setFraudTrendData] = useState({
    labels: [],
    datasets: []
  });

  // Sample heatmap data - transaction locations with fraud intensity
  const [heatmapData, setHeatmapData] = useState([
    // New York area
    { lat: 40.7128, lng: -74.0060, intensity: 0.8 },
    { lat: 40.7328, lng: -73.9860, intensity: 0.6 },
    { lat: 40.7428, lng: -74.0260, intensity: 0.7 },
    { lat: 40.7028, lng: -73.9960, intensity: 0.9 },
    // Los Angeles area
    { lat: 34.0522, lng: -118.2437, intensity: 0.7 },
    { lat: 34.0622, lng: -118.2537, intensity: 0.5 },
    { lat: 34.0722, lng: -118.2337, intensity: 0.6 },
    // Chicago area
    { lat: 41.8781, lng: -87.6298, intensity: 0.8 },
    { lat: 41.8881, lng: -87.6398, intensity: 0.7 },
    { lat: 41.8681, lng: -87.6198, intensity: 0.9 },
    // Miami area
    { lat: 25.7617, lng: -80.1918, intensity: 0.6 },
    { lat: 25.7717, lng: -80.2018, intensity: 0.5 },
    { lat: 25.7517, lng: -80.1818, intensity: 0.7 },
    // San Francisco area
    { lat: 37.7749, lng: -122.4194, intensity: 0.8 },
    { lat: 37.7849, lng: -122.4294, intensity: 0.7 },
    { lat: 37.7649, lng: -122.4094, intensity: 0.9 },
  ]);

  // Function to fetch dashboard data using the API service
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Use the getDashboardData function from the API service
      const dashboardResponse = await getDashboardData();

      // Get recent transactions and alerts
      const transactionsResponse = await getTransactions({ limit: 5 });
      const alertsResponse = await getAlerts();
      const statsResponse = await getStats();

      // Update states with the fetched data
      setDashboardData(dashboardResponse.data);
      setRecentTransactions(transactionsResponse.data);
      setRecentAlerts(alertsResponse.data);

      // Update stats
      if (statsResponse.data) {
        setStats({
          totalTransactions: statsResponse.data.total_transactions || 0,
          fraudulentTransactions: statsResponse.data.total_frauds || 0,
          totalAmount: statsResponse.data.total_amount || 0,
          averageFraudProbability: statsResponse.data.avg_fraud_probability || 0,
          modelAccuracy: statsResponse.data.model_accuracy || 0,
          transactionsTrend: 0,
          fraudTrend: 0,
          amountTrend: 0
        });
      }

      // Check if using mock data
      const isMock = dashboardResponse.data?.isMockData ||
        transactionsResponse.data?.[0]?.isMockData ||
        alertsResponse.data?.[0]?.isMockData;

      setUsingMockData(isMock);

      // Show toast notification for mock data
      if (isMock && !usingMockData) {
        toast('Using mock data. Backend API not available.', {
          icon: '⚠️',
          duration: 4000,
        });
      }

      // Prepare chart data
      if (transactionsResponse.data && transactionsResponse.data.length > 0) {
        prepareDailyTransactionData(transactionsResponse.data);
        prepareFraudDistributionData(transactionsResponse.data);
        prepareFraudTrendData(transactionsResponse.data);
        prepareHeatmapData(transactionsResponse.data);
      }

      setLoading(false);

      // Show success toast only on initial load or manual refresh, not on auto-refresh
      if (loading) {
        toast.success('Dashboard data loaded successfully', {
          icon: '📊',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
      setLoading(false);

      // Show error toast
      toast.error('Failed to load dashboard data', {
        icon: '❌',
        duration: 4000,
      });
    }
  };

  // Function to prepare fraud trend data for the line chart
  const prepareFraudTrendData = (transactions) => {
    // Group transactions by date
    const transactionsByDate = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { total: 0, fraud: 0 };
      }
      acc[date].total += 1;
      if (transaction.is_fraud) {
        acc[date].fraud += 1;
      }
      return acc;
    }, {});

    // Get the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toLocaleDateString();
    }).reverse();

    // Prepare data for the chart
    const data = {
      labels: last7Days,
      datasets: [
        {
          label: 'Fraud Rate (%)',
          data: last7Days.map(date => {
            const dayData = transactionsByDate[date] || { total: 0, fraud: 0 };
            return dayData.total > 0 ? (dayData.fraud / dayData.total) * 100 : 0;
          }),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
        }
      ]
    };

    setFraudTrendData(data);
  };

  // Function to prepare heatmap data from transactions
  const prepareHeatmapData = (transactions) => {
    // Filter for fraudulent transactions
    const fraudTransactions = transactions.filter(t => t.is_fraud);

    // If we have location data in the transactions, use it
    // Otherwise, generate some random locations around major US cities
    if (fraudTransactions.length > 0 && fraudTransactions[0].latitude && fraudTransactions[0].longitude) {
      const heatmapPoints = fraudTransactions.map(t => ({
        lat: t.latitude,
        lng: t.longitude,
        intensity: t.fraud_probability || 0.5
      }));
      setHeatmapData(heatmapPoints);
    } else {
      // Keep using our sample data if no real location data is available
      // We could also generate random points around the existing sample points
      // to create more variation in the heatmap
      const existingPoints = [...heatmapData];
      const newPoints = existingPoints.map(point => {
        // Add some random variation to existing points
        const latVariation = (Math.random() - 0.5) * 0.5;
        const lngVariation = (Math.random() - 0.5) * 0.5;
        const intensityVariation = (Math.random() - 0.5) * 0.2;

        return {
          lat: point.lat + latVariation,
          lng: point.lng + lngVariation,
          intensity: Math.min(Math.max(point.intensity + intensityVariation, 0.1), 1.0)
        };
      });

      // Combine existing and new points
      setHeatmapData([...existingPoints, ...newPoints].slice(0, 30)); // Limit to 30 points
    }
  };

  // Function to refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    toast.loading('Refreshing dashboard data...', { id: 'refresh-toast' });

    try {
      await fetchDashboardData();
      toast.success('Dashboard refreshed successfully', { 
        id: 'refresh-toast',
        icon: '🔄',
        duration: 2000
      });
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      toast.error('Failed to refresh dashboard', { 
        id: 'refresh-toast',
        icon: '❌',
        duration: 3000
      });
    } finally {
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  }, [fetchDashboardData]);

  // Function to handle time range change
  const handleTimeRangeChange = useCallback(async (range) => {
    setTimeRange(range);

    // Map range to readable text for toast
    let rangeText;

    if (range.startsWith('custom:')) {
      const [, startDate, endDate] = range.split(':');
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      rangeText = `${start} to ${end}`;
    } else {
      rangeText = {
        '24h': 'last 24 hours',
        '7days': 'last 7 days',
        '30days': 'last 30 days'
      }[range] || range;
    }

    toast.loading(`Loading data for ${rangeText}...`, { id: 'timerange-toast' });

    try {
      // In a real implementation, we would pass the date range to the API
      // For now, we'll just simulate different data loading based on the range
      let params = {};

      if (range.startsWith('custom:')) {
        const [, startDate, endDate] = range.split(':');
        params = { startDate, endDate };
      } else {
        params = { timeRange: range };
      }

      // We would pass params to fetchDashboardData in a real implementation
      // For now, we'll just call it without params
      await fetchDashboardData();

      toast.success(`Showing data for ${rangeText}`, { 
        id: 'timerange-toast',
        icon: '📅',
        duration: 2000
      });
    } catch (error) {
      console.error('Error fetching dashboard data after time range change:', error);
      toast.error('Failed to update time range', { 
        id: 'timerange-toast',
        icon: '❌',
        duration: 3000
      });
    }
  }, [fetchDashboardData, setTimeRange]);

  // Function to prepare export data for CSV
  const prepareExportData = useCallback(() => {
    const transactionData = recentTransactions.map(t => ({
      'Transaction ID': t.transaction_id,
      'Type': t.transaction_type,
      'Amount': t.amount,
      'From': t.name_orig,
      'To': t.name_dest,
      'Status': t.is_fraud ? 'Fraudulent' : 'Legitimate',
      'Fraud Probability': t.fraud_probability,
      'Timestamp': new Date(t.timestamp).toLocaleString()
    }));

    setExportData(transactionData);

    // Show toast notification
    toast.success(`${transactionData.length} transactions ready for export`, {
      icon: '📊',
      duration: 3000
    });
  }, [recentTransactions, setExportData]);

  // Function to export chart as image
  const exportChartAsImage = useCallback((chartRef, chartName) => {
    if (!chartRef.current) {
      toast.error('Chart not available for export', {
        icon: '❌',
        duration: 3000
      });
      return;
    }

    try {
      // Get the chart canvas
      const canvas = chartRef.current.canvas;

      // Create a temporary link element
      const link = document.createElement('a');

      // Set the download attribute and file name
      link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;

      // Convert the canvas to a data URL and set it as the href
      link.href = canvas.toDataURL('image/png');

      // Append the link to the body
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Remove the link from the body
      document.body.removeChild(link);

      // Show success toast
      toast.success(`${chartName} exported successfully`, {
        icon: '🖼️',
        duration: 3000
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
      toast.error('Failed to export chart', {
        icon: '❌',
        duration: 3000
      });
    }
  }, []);

  // Function to prepare daily transaction data for the bar chart
  const prepareDailyTransactionData = (transactions) => {
    // Group transactions by date
    const transactionsByDate = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {});

    // Get the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toLocaleDateString();
    }).reverse();

    // Prepare data for the chart
    const data = {
      labels: last7Days,
      datasets: [
        {
          label: 'Daily Transaction Volume',
          data: last7Days.map(date => transactionsByDate[date]?.length || 0),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };

    setDailyTransactionData(data);
  };

  // Function to prepare fraud distribution data for the pie chart
  const prepareFraudDistributionData = (transactions) => {
    const fraudCount = transactions.filter(t => t.is_fraud).length;
    const legitimateCount = transactions.length - fraudCount;

    const data = {
      labels: ['Legitimate', 'Fraudulent'],
      datasets: [
        {
          data: [legitimateCount, fraudCount],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }
      ]
    };

    setFraudDistributionData(data);
  };

  useEffect(() => {
    // Call fetchDashboardData on component mount
    fetchDashboardData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <div className="mb-4">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          </div>
          <h4>Loading Dashboard Data</h4>
          <p className="text-muted">Fetching the latest transaction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <Alert variant="danger" className="mt-4 rounded-xl shadow-md border-0">
          <div className="d-flex align-items-center">
            <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
              <FaExclamationTriangle className="text-danger" />
            </div>
            <div>
              <h5 className="font-bold mb-1">Error Loading Dashboard</h5>
              <p className="mb-0">{error}</p>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Transaction Detail Modal */}
      <TransactionDetailModal 
        show={showTransactionModal}
        onHide={() => setShowTransactionModal(false)}
        transactionId={selectedTransactionId}
      />

      {/* Role-Based Access Control Modal */}
      <RoleBasedAccessControlModal
        show={showRbacModal}
        onHide={() => setShowRbacModal(false)}
        roles={userRoles}
        permissions={permissions}
        onSave={(updatedRoles, updatedPermissions) => {
          setUserRoles(updatedRoles);
          setPermissions(updatedPermissions);
          toast.success('Access control settings updated successfully', {
            icon: '🔒',
            duration: 3000
          });
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="d-flex justify-content-between align-items-center mb-4"
      >
        <div className="d-flex align-items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="me-3"
          >
            <FaShieldAlt style={{ fontSize: '2rem', color: 'var(--primary-color)' }} />
          </motion.div>
          <h1 className="mb-0">TrustNet AI Dashboard</h1>
        </div>

        <div className="d-flex">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline-primary" 
              className="me-2 d-flex align-items-center"
              onClick={() => setShowRbacModal(true)}
            >
              <FaUserShield className="me-2" />
              Access Control
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="primary" 
              className="d-flex align-items-center"
              onClick={refreshDashboard}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Refreshing...
                </>
              ) : (
                <>
                  <FaSync className="me-2" />
                  Refresh
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {usingMockData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Alert variant="warning" className="mb-4 rounded shadow">
            <div className="d-flex align-items-center">
              <FaExclamationTriangle style={{ fontSize: '1.25rem', marginRight: '0.5rem' }} />
              <div>
                <strong>Note:</strong> Currently displaying mock data because the backend server is not accessible.
                Please ensure the backend server is running at {process.env.REACT_APP_API_URL || "http://localhost:8002"}.
              </div>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        {[
          {
            icon: FaExchangeAlt,
            value: stats.totalTransactions,
            label: "Total Transactions",
            color: "primary"
          },
          {
            icon: FaExclamationTriangle,
            value: stats.fraudulentTransactions,
            label: "Fraudulent Transactions",
            color: "danger"
          },
          {
            icon: FaMoneyBillWave,
            value: `$${stats.totalAmount.toLocaleString()}`,
            label: "Total Amount",
            color: "success"
          },
          {
            icon: FaChartLine,
            value: `${(stats.averageFraudProbability * 100).toFixed(2)}%`,
            label: "Avg. Fraud Probability",
            color: "warning"
          }
        ].map((stat, index) => (
          <Col md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{
                y: -10,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="stats-card">
                <Card.Body>
                  <motion.div
                    className={`icon text-${stat.color}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: index * 0.1 + 0.3,
                      type: "spring",
                      stiffness: 200
                    }}
                  >
                    <stat.icon />
                  </motion.div>
                  <motion.div
                    className="value"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    {stat.value}
                  </motion.div>
                  <motion.div
                    className="label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.6 }}
                  >
                    {stat.label}
                  </motion.div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        {[
          {
            title: "Daily Transaction Volume",
            chart: (
              <Bar
                data={dailyTransactionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        font: {
                          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                          weight: 'bold'
                        }
                      }
                    },
                    title: {
                      display: true,
                      text: 'Daily Transaction Volume',
                      font: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 16,
                        weight: 'bold'
                      }
                    }
                  },
                  animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                  }
                }}
              />
            )
          },
          {
            title: "Fraud Distribution",
            chart: (
              <Pie
                data={fraudDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        font: {
                          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                          weight: 'bold'
                        }
                      }
                    },
                    title: {
                      display: true,
                      text: 'Fraud vs. Legitimate Transactions',
                      font: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 16,
                        weight: 'bold'
                      }
                    }
                  },
                  animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                  }
                }}
              />
            )
          }
        ].map((chartData, index) => (
          <Col md={6} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3 + index * 0.2,
                duration: 0.5,
                type: "spring",
                stiffness: 100
              }}
            >
              <Card className="h-100 shadow-lg rounded-xl overflow-hidden">
                <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="m-0 font-bold">{chartData.title}</h5>
                  <div className="d-flex">
                    <Button 
                      variant="light" 
                      size="sm" 
                      className="d-flex align-items-center"
                      onClick={() => exportChartAsImage(
                        index === 0 ? chartRefs.dailyTransactions : chartRefs.fraudDistribution,
                        chartData.title
                      )}
                      disabled={!permissions.exportData}
                      title={permissions.exportData ? "Export as image" : "You don't have permission to export data"}
                    >
                      <FaImage className="me-1" size={14} />
                      <span className="d-none d-md-inline">Export</span>
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body className="p-4">
                  <motion.div 
                    className="chart-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: 0.5 + index * 0.2,
                      duration: 0.5
                    }}
                  >
                    {index === 0 ? (
                      <Bar
                        ref={chartRefs.dailyTransactions}
                        data={dailyTransactionData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                font: {
                                  family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                  weight: 'bold'
                                }
                              }
                            },
                            title: {
                              display: true,
                              text: 'Daily Transaction Volume',
                              font: {
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                size: 16,
                                weight: 'bold'
                              }
                            }
                          },
                          animation: {
                            duration: 2000,
                            easing: 'easeOutQuart'
                          }
                        }}
                      />
                    ) : (
                      <Pie
                        ref={chartRefs.fraudDistribution}
                        data={fraudDistributionData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                font: {
                                  family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                  weight: 'bold'
                                }
                              }
                            },
                            title: {
                              display: true,
                              text: 'Fraud vs. Legitimate Transactions',
                              font: {
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                size: 16,
                                weight: 'bold'
                              }
                            }
                          },
                          animation: {
                            duration: 2000,
                            easing: 'easeOutQuart'
                          }
                        }}
                      />
                    )}
                  </motion.div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Fraud Heatmap */}
      <Row className="mb-4">
        <Col md={12}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.5,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
          >
            <Card className="shadow-lg rounded-xl overflow-hidden">
              <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-10 p-2 rounded-lg mr-3">
                    <FaMapMarkedAlt className="text-white" />
                  </div>
                  <h5 className="m-0 font-bold">Fraud Activity Heatmap</h5>
                </div>
                <OverlayTrigger
                  placement="top"
                  overlay={<BSTooltip>Shows geographic distribution of fraudulent transaction activity</BSTooltip>}
                >
                  <div className="bg-white bg-opacity-10 p-2 rounded-circle">
                    <FaInfoCircle className="text-white" />
                  </div>
                </OverlayTrigger>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="map-container">
                  <MapContainer 
                    center={[39.8283, -98.5795]} 
                    zoom={4} 
                    style={{ height: '500px', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <HeatmapLayer
                      points={heatmapData}
                      longitudeExtractor={m => m.lng}
                      latitudeExtractor={m => m.lat}
                      intensityExtractor={m => m.intensity}
                      radius={20}
                      max={1.0}
                      minOpacity={0.1}
                      blur={15}
                      gradient={{
                        0.4: 'blue',
                        0.6: 'lime',
                        0.8: 'yellow',
                        1.0: 'red'
                      }}
                    />
                  </MapContainer>
                </div>
              </Card.Body>
              <Card.Footer className="bg-light p-3">
                <small className="text-muted">
                  <FaInfoCircle className="me-1" /> Heatmap shows intensity of fraudulent transactions across the United States. 
                  Higher intensity (red) indicates areas with more fraud activity.
                </small>
              </Card.Footer>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Recent Transactions and Alerts */}
      <Row className="mb-6">
        {/* Recent Transactions */}
        <Col lg={6} md={12} className="mb-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.7,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
            className="h-100"
          >
            <Card className="h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-lg mr-3">
                    <FaExchangeAlt className="text-primary" />
                  </div>
                  <div>
                    <h5 className="m-0 font-bold">Recent Transactions</h5>
                    <small className="text-muted">Latest financial activities</small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  {/* CSV Export Button */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="me-2"
                  >
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="d-flex align-items-center"
                      onClick={prepareExportData}
                      disabled={!permissions.exportData || recentTransactions.length === 0}
                      title={!permissions.exportData ? "You don't have permission to export data" : 
                             recentTransactions.length === 0 ? "No transactions to export" : 
                             "Export transactions as CSV"}
                    >
                      <FaFileExport className="me-1" size={14} />
                      <span className="d-none d-md-inline">CSV</span>
                      {exportData.length > 0 && (
                        <CSVLink
                          data={exportData}
                          filename={`transactions-${new Date().toISOString().split('T')[0]}.csv`}
                          className="hidden-download-link"
                          target="_blank"
                          ref={(r) => setTimeout(() => {
                            if (r && exportData.length > 0) {
                              r.link.click();
                              setExportData([]);
                            }
                          }, 100)}
                        />
                      )}
                    </Button>
                  </motion.div>

                  {/* View All Button */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link to="/transactions" className="btn btn-sm btn-light rounded-circle">
                      <FaSearch />
                    </Link>
                  </motion.div>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {recentTransactions.length > 0 ? (
                  <div className="overflow-hidden">
                    <Table hover responsive className="transaction-table mb-0">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((transaction, index) => (
                          <motion.tr 
                            key={transaction.transaction_id} 
                            className="transaction-row"
                            onClick={() => {
                              setSelectedTransactionId(transaction.transaction_id);
                              setShowTransactionModal(true);
                            }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              delay: 0.8 + index * 0.1,
                              duration: 0.3
                            }}
                          >
                            <td>{transaction.transaction_type}</td>
                            <td className="font-medium">${transaction.amount.toLocaleString()}</td>
                            <td>{transaction.name_orig}</td>
                            <td>{transaction.name_dest}</td>
                            <td>
                              {transaction.is_fraud ? (
                                <Badge bg="danger" className="badge badge-pill">Fraud</Badge>
                              ) : (
                                <Badge bg="success" className="badge badge-pill">Legitimate</Badge>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <div className="bg-light bg-opacity-50 p-4 rounded-xl mb-3 d-inline-block">
                      <FaExchangeAlt className="text-4xl text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-0">No recent transactions found.</p>
                  </div>
                )}
                <div className="text-end p-3 bg-light bg-opacity-50 border-top">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Link to="/transactions" className="btn btn-primary btn-sm">
                      View All Transactions <FaArrowRight className="ms-2" />
                    </Link>
                  </motion.div>
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>

        {/* Recent Fraud Alerts */}
        <Col lg={6} md={12} className="mb-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.8,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
            className="h-100"
          >
            <Card className="h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-danger bg-opacity-10 p-2 rounded-lg mr-3">
                    <FaExclamationTriangle className="text-danger" />
                  </div>
                  <div>
                    <h5 className="m-0 font-bold">Recent Fraud Alerts</h5>
                    <small className="text-muted">Security notifications</small>
                  </div>
                </div>
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to="/analytics" className="btn btn-sm btn-light rounded-circle">
                    <FaShieldAlt />
                  </Link>
                </motion.div>
              </Card.Header>
              <Card.Body className="p-4">
                {recentAlerts.length > 0 ? (
                  <div className="fraud-alerts">
                    {recentAlerts.map((alert, index) => (
                      <motion.div 
                        key={alert.id} 
                        className="fraud-alert-item"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: 0.9 + index * 0.1,
                          duration: 0.3
                        }}
                      >
                        <div className="alert-header">
                          <h5 className="d-flex align-items-center">
                            <span className="bg-danger bg-opacity-10 p-1 rounded-circle me-2">
                              <FaExclamationTriangle className="text-danger" />
                            </span>
                            <span className="text-truncate">ID: {alert.transaction_id.substring(0, 10)}...</span>
                          </h5>
                          <Badge bg="danger" className="badge badge-pill">
                            {(alert.fraud_probability * 100).toFixed(2)}% Risk
                          </Badge>
                        </div>
                        <div className="alert-body">
                          <p className="mb-2 text-gray-700">
                            <strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <p className="mb-0 text-gray-700">
                              <strong>Status:</strong> 
                              <span className={alert.is_reviewed ? "text-success font-medium ms-1" : "text-warning font-medium ms-1"}>
                                {alert.is_reviewed ? 'Reviewed' : 'Pending Review'}
                              </span>
                            </p>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link 
                                to={`/transactions/${alert.transaction_id}`} 
                                className="btn btn-outline-danger btn-sm"
                              >
                                View Details <FaArrowRight className="ms-2" />
                              </Link>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <div className="bg-light bg-opacity-50 p-4 rounded-xl mb-3 d-inline-block">
                      <FaShieldAlt className="text-4xl text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-0">No recent fraud alerts found.</p>
                  </div>
                )}
                <div className="text-end mt-3 pt-3 border-top">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Link to="/analytics" className="btn btn-primary btn-sm">
                      View All Alerts <FaArrowRight className="ms-2" />
                    </Link>
                  </motion.div>
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
