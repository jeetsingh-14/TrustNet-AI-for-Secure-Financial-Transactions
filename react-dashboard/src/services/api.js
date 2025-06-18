import axios from 'axios';

// Create an Axios instance with the base URL
// Use environment variable if available, otherwise fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || window.location.hostname === 'localhost' 
  ? "http://localhost:8002" 
  : `http://${window.location.hostname}:8002`;

const api = axios.create({
  baseURL: API_URL
});

// Mock data for fallback when backend is not available
const mockTransactions = [
  {
    transaction_id: "mock-transaction-1",
    transaction_type: "PAYMENT",
    amount: 1250.00,
    name_orig: "C123456789",
    old_balance_orig: 5000.00,
    new_balance_orig: 3750.00,
    name_dest: "M987654321",
    old_balance_dest: 200.00,
    new_balance_dest: 1450.00,
    is_fraud: false,
    fraud_probability: 0.05,
    timestamp: new Date().toISOString()
  },
  {
    transaction_id: "mock-transaction-2",
    transaction_type: "TRANSFER",
    amount: 8750.00,
    name_orig: "C234567890",
    old_balance_orig: 10000.00,
    new_balance_orig: 1250.00,
    name_dest: "M876543210",
    old_balance_dest: 1000.00,
    new_balance_dest: 9750.00,
    is_fraud: true,
    fraud_probability: 0.92,
    timestamp: new Date().toISOString()
  },
  {
    transaction_id: "mock-transaction-3",
    transaction_type: "CASH_OUT",
    amount: 3500.00,
    name_orig: "C345678901",
    old_balance_orig: 7500.00,
    new_balance_orig: 4000.00,
    name_dest: "M765432109",
    old_balance_dest: 0.00,
    new_balance_dest: 3500.00,
    is_fraud: false,
    fraud_probability: 0.15,
    timestamp: new Date().toISOString()
  },
  {
    transaction_id: "mock-transaction-4",
    transaction_type: "DEBIT",
    amount: 500.00,
    name_orig: "C456789012",
    old_balance_orig: 2000.00,
    new_balance_orig: 1500.00,
    name_dest: "M654321098",
    old_balance_dest: 0.00,
    new_balance_dest: 500.00,
    is_fraud: false,
    fraud_probability: 0.02,
    timestamp: new Date().toISOString()
  },
  {
    transaction_id: "mock-transaction-5",
    transaction_type: "TRANSFER",
    amount: 12000.00,
    name_orig: "C567890123",
    old_balance_orig: 15000.00,
    new_balance_orig: 3000.00,
    name_dest: "M543210987",
    old_balance_dest: 500.00,
    new_balance_dest: 12500.00,
    is_fraud: true,
    fraud_probability: 0.88,
    timestamp: new Date().toISOString()
  }
];

const mockAlerts = [
  {
    id: "mock-alert-1",
    transaction_id: "mock-transaction-2",
    fraud_probability: 0.92,
    is_reviewed: false,
    timestamp: new Date().toISOString()
  },
  {
    id: "mock-alert-2",
    transaction_id: "mock-transaction-5",
    fraud_probability: 0.88,
    is_reviewed: false,
    timestamp: new Date().toISOString()
  }
];

const mockStats = {
  total_transactions: 5,
  total_frauds: 2,
  total_amount: 26000.00,
  avg_fraud_probability: 0.40,
  model_accuracy: 0.95
};

// API functions for transactions with fallback to mock data
export const getTransactions = (params) => {
  return api.get("/transactions", { params })
    .catch(error => {
      console.warn("Using mock transaction data due to API error:", error);
      // Return mock data in the same format as the API would
      return {
        data: mockTransactions.map(t => ({...t, isMockData: true})),
        headers: { 'x-total-count': mockTransactions.length.toString() }
      };
    });
};

export const getTransaction = (id) => {
  return api.get(`/transactions/${id}`)
    .catch(error => {
      console.warn("Using mock transaction data due to API error:", error);
      const mockTransaction = mockTransactions.find(t => t.transaction_id === id) || mockTransactions[0];
      return { data: {...mockTransaction, isMockData: true} };
    });
};

export const predict = (data) => api.post("/predict", data);

// API functions for alerts and stats with fallback to mock data
export const getAlerts = () => {
  return api.get("/alerts")
    .catch(error => {
      console.warn("Using mock alerts data due to API error:", error);
      return { data: mockAlerts.map(a => ({...a, isMockData: true})) };
    });
};

export const getStats = () => {
  return api.get("/stats")
    .catch(error => {
      console.warn("Using mock stats data due to API error:", error);
      return { data: {...mockStats, isMockData: true} };
    });
};

export const getDashboardData = () => {
  return api.get("/dashboard-data")
    .catch(error => {
      console.warn("Using mock dashboard data due to API error:", error);
      // Return mock data in the same format as the dashboard-data endpoint
      return { 
        data: {
          total_transactions: mockStats.total_transactions,
          total_amount: mockStats.total_amount,
          fraudulent_transactions: mockStats.total_frauds,
          fraud_rate: (mockStats.total_frauds / mockStats.total_transactions) * 100,
          isMockData: true
        } 
      };
    });
};

// Interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    // Return a rejected promise to allow catch blocks to handle it
    return Promise.reject(error);
  }
);

export default api;
