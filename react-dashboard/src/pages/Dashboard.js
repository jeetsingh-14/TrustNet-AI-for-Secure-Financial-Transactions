import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Table, Badge, Alert, Button, OverlayTrigger, Tooltip as BSTooltip, Spinner, Dropdown } from 'react-bootstrap';
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
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle,
  FaClock,
  FaMapMarkedAlt,
  FaImage,
  FaFileExport,
  FaUserShield,
  FaFileExcel,
  FaFilePdf,
  FaFileCsv,
  FaExternalLinkAlt,
  FaCheck,
  FaUndo
} from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { motion } from 'framer-motion';
import { getTransactions, getAlerts, getStats, getDashboardData } from '../services/api';
import { CSVLink } from 'react-csv';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import TransactionDetailModal from '../components/TransactionDetailModal';
import RoleBasedAccessControlModal from '../components/RoleBasedAccessControlModal';

// Import new design system components
import { 
  KPIWidget, 
  MetricCard,
  Toolbar, 
  ToolbarButton, 
  ToolbarGroup, 
  SectionHeader, 
  StatusBadge, 
  BackendStatus,
  KPICard 
} from '../components/common';


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
        '7d': 'last 7 days',
        '30d': 'last 30 days',
        '90d': 'last 90 days'
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
        className="dashboard-header"
      >
        <div className="dashboard-title">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="dashboard-icon"
          >
            <FaShieldAlt style={{ fontSize: '2rem', color: 'var(--primary)' }} />
          </motion.div>
          <div>
            <h1 className="mb-0">TrustNet AI Dashboard</h1>
            <div className="dashboard-subtitle">
              <div className="last-updated">
                <FaClock className="last-updated-icon" />
                <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <BackendStatus isConnected={!usingMockData} />
            </div>
          </div>
        </div>

        <Toolbar position="right">
          <ToolbarGroup>
            <ToolbarButton 
              icon={<FaUserShield />}
              label="Access Control"
              onClick={() => setShowRbacModal(true)}
              variant="default"
            />
            <ToolbarButton 
              icon={refreshing ? <Spinner animation="border" size="sm" /> : <FaSync />}
              label={refreshing ? "Refreshing..." : "Refresh"}
              onClick={refreshDashboard}
              disabled={refreshing}
              variant="primary"
            />
          </ToolbarGroup>
        </Toolbar>
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

      {/* KPI Cards Section - 3 Columns Grid (responsive) */}
      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar-title">
          <FaChartLine />
          <h2>Dashboard Overview</h2>
        </div>
        <div className="dashboard-toolbar-actions">
          <Button variant="outline-secondary" size="sm">
            <FaFilter className="me-2" />
            Filter
          </Button>
          <CSVLink
            data={exportData}
            filename={`trustnet-dashboard-${new Date().toISOString().split('T')[0]}.csv`}
            className="btn btn-primary btn-sm"
            onClick={prepareExportData}
          >
            <FaFileCsv className="me-2" />
            Export CSV
          </CSVLink>
        </div>
      </div>

      <div className="analytics-kpi-section mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 py-4">
          {[
            {
              icon: <FaExchangeAlt />,
              title: "Total Transactions",
              value: stats.totalTransactions,
              subtitle: stats.transactionsTrend > 0 ? `+${stats.transactionsTrend}% from last period` : `${stats.transactionsTrend}% from last period`,
              color: "primary",
              tooltip: "Total number of transactions processed in the system"
            },
            {
              icon: <FaExclamationTriangle />,
              title: "Fraudulent Transactions",
              value: stats.fraudulentTransactions,
              subtitle: stats.fraudTrend > 0 ? `+${stats.fraudTrend}% from last period` : `${stats.fraudTrend}% from last period`,
              color: "danger",
              tooltip: "Transactions flagged as fraudulent by the AI system"
            },
            {
              icon: <FaMoneyBillWave />,
              title: "Total Amount",
              value: `$${new Intl.NumberFormat().format(stats.totalAmount)}`,
              subtitle: stats.amountTrend > 0 ? `+${stats.amountTrend}% from last period` : `${stats.amountTrend}% from last period`,
              color: "success",
              tooltip: "Total monetary value of all transactions"
            },
            {
              icon: <FaChartLine />,
              title: "Avg. Risk Score",
              value: (stats.averageFraudProbability * 100).toFixed(1) + '%',
              subtitle: "Based on AI predictions",
              color: "warning",
              tooltip: "Average fraud probability score across all transactions"
            },
            {
              icon: <FaShieldAlt />,
              title: "Threats Blocked",
              value: Math.floor(stats.fraudulentTransactions * 0.7),
              subtitle: "+5% from last period",
              color: "info",
              tooltip: "Fraudulent transactions that were automatically blocked"
            },
            {
              icon: <FaClock />,
              title: "Pending Review",
              value: Math.floor(stats.totalTransactions * 0.05),
              subtitle: "-2% from last period",
              color: "primary",
              tooltip: "Transactions awaiting manual verification"
            }
          ].map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5
              }}
            >
              <KPICard
                icon={kpi.icon}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                color={kpi.color}
                tooltip={kpi.tooltip}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts & Visualizations (Middle Section) */}
      <Row className="mb-4">
        {/* Daily Transaction Volume Chart */}
        <Col lg={7} md={12} className="mb-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
          >
            <Card className="h-100 shadow-lg rounded-xl overflow-hidden glass-card">
              <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <h5 className="m-0 font-bold">Daily Transaction Volume</h5>
                <div className="d-flex">
                  {/* Time Range Selector */}
                  <div className="btn-group me-2">
                    {['7D', '30D', '90D'].map((range) => (
                      <Button 
                        key={range}
                        variant={timeRange === range.toLowerCase() ? "light" : "outline-light"} 
                        size="sm"
                        onClick={() => handleTimeRangeChange(range.toLowerCase())}
                        className="time-range-btn"
                      >
                        {range}
                      </Button>
                    ))}
                  </div>

                  {/* Export Button */}
                  <Dropdown align="end">
                    <Dropdown.Toggle 
                      variant="light" 
                      size="sm" 
                      id="dropdown-export"
                      className="d-flex align-items-center"
                      disabled={!permissions.exportData}
                    >
                      <FaFileExport className="me-1" size={14} />
                      <span className="d-none d-md-inline">Export</span>
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item 
                        onClick={() => exportChartAsImage(chartRefs.dailyTransactions, "Daily Transaction Volume")}
                      >
                        <FaImage className="me-2" size={14} /> Image (.png)
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileCsv className="me-2" size={14} /> CSV
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileExcel className="me-2" size={14} /> Excel
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <motion.div 
                  className="chart-container"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: 0.5,
                    duration: 0.5
                  }}
                  style={{ height: "300px" }}
                >
                  {/* Combined Bar and Line Chart */}
                  <Bar
                    ref={chartRefs.dailyTransactions}
                    data={{
                      labels: dailyTransactionData.labels,
                      datasets: [
                        {
                          type: 'bar',
                          label: 'Transaction Count',
                          data: dailyTransactionData.datasets[0].data,
                          backgroundColor: 'rgba(54, 162, 235, 0.6)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                          order: 2
                        },
                        {
                          type: 'line',
                          label: 'Trend',
                          data: dailyTransactionData.datasets[0].data.map((val, i, arr) => {
                            // Calculate moving average for trend line
                            if (i === 0) return val;
                            return (val + arr[i-1]) / 2;
                          }),
                          borderColor: 'rgba(255, 99, 132, 1)',
                          borderWidth: 2,
                          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                          pointRadius: 3,
                          tension: 0.4,
                          fill: false,
                          order: 1
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            font: {
                              family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                              weight: 'bold'
                            }
                          }
                        },
                        tooltip: {
                          usePointStyle: true,
                          callbacks: {
                            label: function(context) {
                              let label = context.dataset.label || '';
                              if (label) {
                                label += ': ';
                              }
                              if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString();
                              }
                              return label;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false
                          }
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        }
                      },
                      animation: {
                        duration: 2000,
                        easing: 'easeOutQuart'
                      }
                    }}
                  />
                </motion.div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>

        {/* Fraud Distribution Donut Chart */}
        <Col lg={5} md={12} className="mb-4">
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
            <Card className="h-100 shadow-lg rounded-xl overflow-hidden glass-card">
              <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <h5 className="m-0 font-bold">Fraud Distribution</h5>
                <div className="d-flex">
                  <Dropdown align="end">
                    <Dropdown.Toggle 
                      variant="light" 
                      size="sm" 
                      id="dropdown-export-fraud"
                      className="d-flex align-items-center"
                      disabled={!permissions.exportData}
                    >
                      <FaFileExport className="me-1" size={14} />
                      <span className="d-none d-md-inline">Export</span>
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item 
                        onClick={() => exportChartAsImage(chartRefs.fraudDistribution, "Fraud Distribution")}
                      >
                        <FaImage className="me-2" size={14} /> Image (.png)
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileCsv className="me-2" size={14} /> CSV
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileExcel className="me-2" size={14} /> Excel
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <motion.div 
                  className="chart-container"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: 0.7,
                    duration: 0.5
                  }}
                  style={{ height: "300px", position: "relative" }}
                >
                  {/* Donut Chart */}
                  <Pie
                    ref={chartRefs.fraudDistribution}
                    data={{
                      labels: fraudDistributionData.labels,
                      datasets: [{
                        data: fraudDistributionData.datasets[0].data,
                        backgroundColor: [
                          'rgba(75, 192, 192, 0.8)',
                          'rgba(255, 99, 132, 0.8)'
                        ],
                        borderColor: [
                          'rgba(75, 192, 192, 1)',
                          'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1,
                        hoverOffset: 10
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%', // This makes it a donut chart
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                              family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                              size: 12,
                              weight: 'bold'
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = context.raw;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${context.label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      },
                      animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 2000,
                        easing: 'easeOutQuart'
                      }
                    }}
                  />

                  {/* Center text showing total */}
                  <div className="donut-inner">
                    <h4>{fraudDistributionData.datasets[0].data.reduce((a, b) => a + b, 0)}</h4>
                    <p>Total</p>
                  </div>
                </motion.div>

                {/* Percentage indicators below chart */}
                <div className="d-flex justify-content-around mt-3">
                  {fraudDistributionData.labels.map((label, i) => {
                    const value = fraudDistributionData.datasets[0].data[i];
                    const total = fraudDistributionData.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);

                    return (
                      <div key={i} className="text-center">
                        <div className={`percentage-indicator ${i === 0 ? 'legitimate' : 'fraudulent'}`}>
                          {percentage}%
                        </div>
                        <div className="percentage-label">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Enhanced Fraud Heatmap */}
      <Row className="mb-4">
        <Col md={12}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.7,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
          >
            <Card className="shadow-lg rounded-xl overflow-hidden glass-card">
              <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-10 p-2 rounded-lg me-3">
                    <FaMapMarkedAlt className="text-white" />
                  </div>
                  <h5 className="m-0 font-bold">Fraud Activity Heatmap</h5>
                </div>
                <div className="d-flex align-items-center">
                  <OverlayTrigger
                    placement="top"
                    overlay={<BSTooltip>Shows geographic distribution of fraudulent transaction activity</BSTooltip>}
                  >
                    <div className="bg-white bg-opacity-10 p-2 rounded-circle me-3">
                      <FaInfoCircle className="text-white" />
                    </div>
                  </OverlayTrigger>

                  <Dropdown align="end">
                    <Dropdown.Toggle 
                      variant="light" 
                      size="sm" 
                      id="dropdown-export-heatmap"
                      className="d-flex align-items-center"
                      disabled={!permissions.exportData}
                    >
                      <FaFileExport className="me-1" size={14} />
                      <span className="d-none d-md-inline">Export</span>
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item>
                        <FaImage className="me-2" size={14} /> Image (.png)
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileCsv className="me-2" size={14} /> CSV
                      </Dropdown.Item>
                      <Dropdown.Item>
                        <FaFileExcel className="me-2" size={14} /> Excel
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="enhanced-map-container">
                  <MapContainer 
                    center={[39.8283, -98.5795]} 
                    zoom={4} 
                    style={{ height: '550px', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Enhanced Heatmap Layer */}
                    <HeatmapLayer
                      points={heatmapData}
                      longitudeExtractor={m => m.lng}
                      latitudeExtractor={m => m.lat}
                      intensityExtractor={m => m.intensity}
                      radius={25}
                      max={1.0}
                      minOpacity={0.2}
                      blur={15}
                      gradient={{
                        0.2: 'blue',
                        0.4: 'cyan',
                        0.6: 'lime',
                        0.8: 'yellow',
                        1.0: 'red'
                      }}
                    />

                    {/* Add markers for top fraud locations with tooltips */}
                    {heatmapData
                      .filter(point => point.intensity > 0.7) // Only show high-intensity points
                      .map((point, index) => {
                        // Generate city names for demo purposes
                        const cities = [
                          'New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco',
                          'Dallas', 'Houston', 'Phoenix', 'Philadelphia', 'Atlanta'
                        ];
                        const cityName = cities[index % cities.length];
                        const fraudCount = Math.floor(point.intensity * 100);

                        return (
                          <Marker 
                            key={index}
                            position={[point.lat, point.lng]}
                            icon={L.divIcon({
                              className: 'custom-fraud-marker',
                              html: `<div class="fraud-marker-pin"></div>`,
                              iconSize: [30, 30],
                              iconAnchor: [15, 30]
                            })}
                          >
                            <Popup>
                              <div className="fraud-location-popup">
                                <h6>{cityName}</h6>
                                <p>
                                  <strong>Fraud Count:</strong> {fraudCount}<br />
                                  <strong>Risk Level:</strong> {point.intensity > 0.8 ? 'High' : 'Medium'}<br />
                                  <strong>Fraud Rate:</strong> {(point.intensity * 100).toFixed(1)}%
                                </p>
                                <Button 
                                  size="sm" 
                                  variant="outline-primary" 
                                  className="w-100"
                                >
                                  View Details
                                </Button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })
                    }
                  </MapContainer>
                </div>
              </Card.Body>
              <Card.Footer className="bg-light p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <FaInfoCircle className="me-1" /> Heatmap shows intensity of fraudulent transactions across the United States. 
                    Higher intensity (red) indicates areas with more fraud activity.
                  </small>
                  <div className="heatmap-legend d-flex align-items-center">
                    <span className="me-2">Fraud Intensity:</span>
                    <div className="heatmap-gradient"></div>
                    <span className="ms-1 me-1">Low</span>
                    <span className="ms-1">High</span>
                  </div>
                </div>
              </Card.Footer>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Transaction Table (Bottom Section) */}
      <Row className="mb-6">
        {/* Enhanced Transaction Table */}
        <Col lg={8} md={12} className="mb-4">
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
            <Card className="h-100 shadow-lg rounded-xl overflow-hidden">
              <Card.Header className="bg-gradient-to-r from-primary to-dark text-white py-3 px-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center">
                    <div className="bg-white bg-opacity-10 p-2 rounded-lg me-3">
                      <FaExchangeAlt className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white m-0">Transaction Management</h2>
                      <small className="text-white text-opacity-75">Monitor and analyze financial activities</small>
                    </div>
                  </div>
                  <div className="d-flex space-x-3">
                    {/* Live Feed Button */}
                    <button 
                      className="flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 me-2"
                      onClick={() => toast.success("Live feed toggled")}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 me-2 animate-pulse"></span>
                      <span>Pause Live Feed</span>
                    </button>

                    {/* Refresh Button */}
                    <button 
                      className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 me-2"
                      onClick={refreshDashboard}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Spinner animation="border" size="sm" className="me-2" />
                      ) : (
                        <FaSync className="me-2" />
                      )}
                      <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
                    </button>

                    {/* Export Dropdown */}
                    <Dropdown align="end" className="me-2">
                      <Dropdown.Toggle 
                        variant="light" 
                        size="sm" 
                        id="dropdown-export-transactions"
                        className="d-flex align-items-center"
                        disabled={!permissions.exportData || recentTransactions.length === 0}
                      >
                        <FaFileExport className="me-1" size={14} />
                        <span className="d-none d-md-inline">Export</span>
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item 
                          onClick={prepareExportData}
                          disabled={recentTransactions.length === 0}
                        >
                          <FaFileCsv className="me-2" size={14} /> CSV
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
                        </Dropdown.Item>
                        <Dropdown.Item disabled={recentTransactions.length === 0}>
                          <FaFileExcel className="me-2" size={14} /> Excel
                        </Dropdown.Item>
                        <Dropdown.Item disabled={recentTransactions.length === 0}>
                          <FaFilePdf className="me-2" size={14} /> PDF
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>

                    {/* View All Button */}
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link to="/transactions" className="btn btn-sm btn-light d-flex align-items-center">
                        <FaExternalLinkAlt className="me-1" size={12} />
                        <span className="d-none d-md-inline">View All</span>
                      </Link>
                    </motion.div>
                  </div>
                </div>

                {/* Data Status Bar */}
                <div className="text-xs text-white text-opacity-80 mt-2">
                  Last Refreshed: {lastUpdated.toLocaleTimeString()} | Session Time: {Math.floor((new Date() - lastUpdated) / 60000)} min | Alert Count: {recentAlerts.length}
                </div>
              </Card.Header>

              {/* Transaction Metrics Grid */}
              <div className="transaction-metrics-section p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 px-6">
                  <MetricCard icon="📄" title="Transactions Loaded" value={recentTransactions.length} description="Total transactions in current view" variant="neutral" />
                  <MetricCard icon="💰" title="Total Amount" value={`$${recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2)}`} description="Live total of financial activity" variant="success" />
                  <MetricCard icon="🚨" title="Fraudulent Transactions" value={recentTransactions.filter(t => t.isFraudulent).length} description="Detected suspicious activities" variant="danger" />
                  <MetricCard icon="📊" title="Fraud Rate" value={`${recentTransactions.length ? ((recentTransactions.filter(t => t.isFraudulent).length / recentTransactions.length) * 100).toFixed(2) : 0}%`} description="Percentage of fraudulent transactions" variant="warning" />
                </div>
              </div>

              {/* Search and Filter Bar */}
              <div className="transaction-filter-bar p-3 bg-light border-bottom">
                <Row className="align-items-center">
                  <Col md={4} sm={12} className="mb-2 mb-md-0">
                    <div className="search-container">
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        placeholder="Search transactions..." 
                        aria-label="Search transactions"
                      />
                      <FaSearch className="search-icon" />
                    </div>
                  </Col>
                  <Col md={8} sm={12}>
                    <div className="d-flex flex-wrap justify-content-md-end">
                      <div className="me-2 mb-2 mb-md-0">
                        <select className="form-select form-select-sm">
                          <option value="">All Types</option>
                          <option value="PAYMENT">Payment</option>
                          <option value="TRANSFER">Transfer</option>
                          <option value="CASH_OUT">Cash Out</option>
                          <option value="DEBIT">Debit</option>
                        </select>
                      </div>
                      <div className="me-2 mb-2 mb-md-0">
                        <select className="form-select form-select-sm">
                          <option value="">All Status</option>
                          <option value="true">Fraudulent</option>
                          <option value="false">Legitimate</option>
                        </select>
                      </div>
                      <div>
                        <Button variant="primary" size="sm">
                          <FaFilter className="me-1" size={12} /> Filter
                        </Button>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              <Card.Body className="p-0">
                {recentTransactions.length > 0 ? (
                  <div className="enhanced-table-container">
                    <Table hover responsive className="enhanced-transaction-table mb-0">
                      <thead>
                        <tr>
                          <th className="sortable">
                            <div className="d-flex align-items-center">
                              ID <FaArrowDown className="ms-1 sort-icon" size={10} />
                            </div>
                          </th>
                          <th className="sortable">
                            <div className="d-flex align-items-center">
                              Type <FaArrowDown className="ms-1 sort-icon" size={10} />
                            </div>
                          </th>
                          <th className="sortable">
                            <div className="d-flex align-items-center">
                              Amount <FaArrowDown className="ms-1 sort-icon" size={10} />
                            </div>
                          </th>
                          <th>From</th>
                          <th>To</th>
                          <th className="sortable">
                            <div className="d-flex align-items-center">
                              Time <FaArrowDown className="ms-1 sort-icon" size={10} />
                            </div>
                          </th>
                          <th className="sortable">
                            <div className="d-flex align-items-center">
                              Status <FaArrowDown className="ms-1 sort-icon" size={10} />
                            </div>
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((transaction, index) => (
                          <motion.tr 
                            key={transaction.transaction_id} 
                            className={`enhanced-transaction-row ${transaction.is_fraud ? 'fraud-row' : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              delay: 0.8 + index * 0.1,
                              duration: 0.3
                            }}
                          >
                            <td className="transaction-id">
                              {transaction.transaction_id.substring(0, 8)}...
                            </td>
                            <td>
                              <Badge 
                                bg={
                                  transaction.transaction_type === 'PAYMENT' ? 'info' :
                                  transaction.transaction_type === 'TRANSFER' ? 'primary' :
                                  transaction.transaction_type === 'CASH_OUT' ? 'warning' : 'secondary'
                                }
                                className="transaction-type-badge"
                              >
                                {transaction.transaction_type}
                              </Badge>
                            </td>
                            <td className="amount-cell">
                              ${transaction.amount.toLocaleString()}
                            </td>
                            <td className="account-cell">{transaction.name_orig}</td>
                            <td className="account-cell">{transaction.name_dest}</td>
                            <td className="time-cell">
                              {new Date(transaction.timestamp).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td>
                              <div className="status-indicator-container">
                                <div className={`status-indicator-dot ${transaction.is_fraud ? 'fraud' : 'legitimate'}`}></div>
                                <span className={`status-text ${transaction.is_fraud ? 'text-danger' : 'text-success'}`}>
                                  {transaction.is_fraud ? 'Fraud' : 'Legitimate'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                className="action-btn"
                                onClick={() => {
                                  setSelectedTransactionId(transaction.transaction_id);
                                  setShowTransactionModal(true);
                                }}
                              >
                                Details
                              </Button>
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

                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-center p-3 bg-light border-top">
                  <div className="text-muted small">
                    Showing 1-{recentTransactions.length} of {recentTransactions.length} transactions
                  </div>
                  <div className="d-flex align-items-center">
                    <div className="me-3 d-flex align-items-center">
                      <span className="me-2 small">Rows:</span>
                      <select className="form-select form-select-sm" style={{ width: '70px' }}>
                        <option value="5">5</option>
                        <option value="10" selected>10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                    <nav aria-label="Transaction pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className="page-item disabled">
                          <button className="page-link" tabIndex="-1" aria-disabled="true">Previous</button>
                        </li>
                        <li className="page-item active" aria-current="page">
                          <button className="page-link">1</button>
                        </li>
                        <li className="page-item">
                          <button className="page-link">2</button>
                        </li>
                        <li className="page-item">
                          <button className="page-link">3</button>
                        </li>
                        <li className="page-item">
                          <button className="page-link">Next</button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>

        {/* Fraud Alerts Panel (Right Side) */}
        <Col lg={4} md={12} className="mb-4">
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
            <Card className="h-100 shadow-lg rounded-xl overflow-hidden fraud-alerts-panel">
              <Card.Header className="bg-gradient-to-r from-danger to-warning text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-10 p-2 rounded-lg me-3">
                    <FaExclamationTriangle className="text-white" />
                  </div>
                  <div>
                    <h5 className="m-0 font-bold">Fraud Alerts</h5>
                    <small className="text-white text-opacity-75">
                      {recentAlerts.filter(a => !a.is_reviewed).length} alerts require attention
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <Button 
                    variant="light" 
                    size="sm"
                    className="d-flex align-items-center"
                    onClick={() => {
                      // In a real app, this would mark all as reviewed
                      toast.success('All alerts marked as reviewed');
                    }}
                  >
                    <FaCheck className="me-1" size={12} />
                    <span className="d-none d-md-inline">Mark All</span>
                  </Button>
                </div>
              </Card.Header>

              <div className="alerts-filter-bar p-3 bg-light border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="alert-priority-filter">
                    <div className="btn-group btn-group-sm">
                      <Button variant="outline-secondary" active>All</Button>
                      <Button variant="outline-danger">High</Button>
                      <Button variant="outline-warning">Medium</Button>
                      <Button variant="outline-success">Low</Button>
                    </div>
                  </div>
                  <div className="alert-status-filter">
                    <select className="form-select form-select-sm">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="alerts-container">
                {recentAlerts.length > 0 ? (
                  <div className="enhanced-fraud-alerts">
                    {recentAlerts.map((alert, index) => {
                      // Determine priority based on fraud probability
                      const priority = 
                        alert.fraud_probability > 0.8 ? 'high' : 
                        alert.fraud_probability > 0.5 ? 'medium' : 'low';

                      return (
                        <motion.div 
                          key={alert.id} 
                          className={`enhanced-alert-item priority-${priority} ${alert.is_reviewed ? 'reviewed' : 'pending'}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: 0.9 + index * 0.1,
                            duration: 0.3
                          }}
                        >
                          <div className="alert-priority-indicator"></div>
                          <div className="alert-content">
                            <div className="alert-header">
                              <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0 d-flex align-items-center">
                                  <span className={`priority-dot priority-${priority} me-2`}></span>
                                  <span className="transaction-id">
                                    {alert.transaction_id.substring(0, 10)}...
                                  </span>
                                </h6>
                                <Badge 
                                  bg={priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'success'}
                                  className="risk-badge"
                                >
                                  {(alert.fraud_probability * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <div className="alert-meta">
                                <small className="text-muted">
                                  <FaClock className="me-1" size={10} />
                                  {new Date(alert.timestamp).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                                <Badge 
                                  bg={alert.is_reviewed ? 'success' : 'warning'} 
                                  className="status-badge ms-2"
                                >
                                  {alert.is_reviewed ? 'Reviewed' : 'Pending'}
                                </Badge>
                              </div>
                            </div>
                            <div className="alert-actions mt-2">
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-2 action-btn"
                                onClick={() => {
                                  setSelectedTransactionId(alert.transaction_id);
                                  setShowTransactionModal(true);
                                }}
                              >
                                <FaSearch className="me-1" size={10} /> Details
                              </Button>
                              <Button 
                                variant={alert.is_reviewed ? "outline-secondary" : "outline-success"} 
                                size="sm"
                                className="action-btn"
                                onClick={() => {
                                  // In a real app, this would mark as reviewed
                                  toast.success(`Alert ${alert.transaction_id.substring(0, 8)} marked as ${alert.is_reviewed ? 'pending' : 'reviewed'}`);
                                }}
                              >
                                {alert.is_reviewed ? (
                                  <>
                                    <FaUndo className="me-1" size={10} /> Reopen
                                  </>
                                ) : (
                                  <>
                                    <FaCheck className="me-1" size={10} /> Resolve
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <div className="bg-light bg-opacity-50 p-4 rounded-xl mb-3 d-inline-block">
                      <FaShieldAlt className="text-4xl text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-0">No fraud alerts found.</p>
                  </div>
                )}
              </div>

              <Card.Footer className="bg-light p-3 d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Showing {recentAlerts.length} of {recentAlerts.length} alerts
                </small>
                <Link to="/analytics" className="btn btn-primary btn-sm">
                  View All Alerts <FaArrowRight className="ms-1" size={10} />
                </Link>
              </Card.Footer>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Coming Soon Section (Future Enhancements) */}
      <Row className="mb-4">
        <Col md={12}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.9,
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
          >
            <Card className="shadow-lg rounded-xl overflow-hidden glass-card">
              <Card.Header className="bg-gradient-to-r from-secondary to-primary text-white py-3 px-4">
                <div className="d-flex align-items-center">
                  <div className="bg-white bg-opacity-10 p-2 rounded-lg me-3">
                    <FaChartLine className="text-white" />
                  </div>
                  <div>
                    <h5 className="m-0 font-bold">Coming Soon</h5>
                    <small className="text-white text-opacity-75">Future enhancements to the TrustNet AI platform</small>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <Row>
                  {[
                    {
                      title: "AI Model Accuracy Trend",
                      icon: FaChartLine,
                      description: "Track the performance of our fraud detection models over time with detailed accuracy metrics and trend analysis.",
                      color: "primary"
                    },
                    {
                      title: "Model Drift Alerts",
                      icon: FaExclamationTriangle,
                      description: "Get notified when our AI models start to drift from their baseline performance, ensuring consistent fraud detection.",
                      color: "warning"
                    },
                    {
                      title: "User Behavior Analytics",
                      icon: FaUserShield,
                      description: "Analyze user behavior patterns to identify anomalies and potential account takeovers before they lead to fraud.",
                      color: "success"
                    }
                  ].map((feature, index) => (
                    <Col md={4} key={index} className="mb-3 mb-md-0">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 1.0 + index * 0.1,
                          duration: 0.5
                        }}
                        className="h-100"
                      >
                        <Card className="coming-soon-card h-100 border-0">
                          <Card.Body className="d-flex flex-column">
                            <div className={`coming-soon-icon-container bg-${feature.color} bg-opacity-10 p-3 rounded-circle mb-3`}>
                              <feature.icon className={`text-${feature.color}`} size={24} />
                            </div>
                            <h5 className="coming-soon-title">{feature.title}</h5>
                            <p className="coming-soon-description text-muted flex-grow-1">{feature.description}</p>
                            <div className="mt-3">
                              <Badge bg="secondary" className="coming-soon-badge">
                                Coming Q2 2023
                              </Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
              <Card.Footer className="bg-light p-3 text-center">
                <p className="text-muted mb-0">
                  <FaInfoCircle className="me-1" /> These features are currently in development. Stay tuned for updates!
                </p>
              </Card.Footer>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
