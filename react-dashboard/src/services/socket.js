import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

// Create a socket instance using the same base URL as the API
const API_URL = process.env.REACT_APP_API_URL || window.location.hostname === 'localhost' 
  ? "http://localhost:8000" 
  : `http://${window.location.hostname}:8000`;

// Create a socket instance
let socket;

// Mock transaction data for testing when backend is not available
const generateMockTransaction = () => {
  const transactionTypes = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT'];
  const isFraud = Math.random() > 0.8; // 20% chance of fraud

  return {
    transaction_id: `mock-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    transaction_type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
    amount: Math.floor(Math.random() * 10000) + 100,
    name_orig: `C${Math.floor(Math.random() * 1000000000)}`,
    old_balance_orig: Math.floor(Math.random() * 20000),
    new_balance_orig: Math.floor(Math.random() * 15000),
    name_dest: `M${Math.floor(Math.random() * 1000000000)}`,
    old_balance_dest: Math.floor(Math.random() * 5000),
    new_balance_dest: Math.floor(Math.random() * 10000),
    is_fraud: isFraud,
    fraud_probability: isFraud ? 0.7 + (Math.random() * 0.3) : Math.random() * 0.3,
    timestamp: new Date().toISOString(),
    location: {
      lat: 40 - (Math.random() * 10), // Random latitude around North America
      lng: -100 + (Math.random() * 50), // Random longitude around North America
    },
    isMockData: true
  };
};

// Initialize socket connection
export const initSocket = (callback) => {
  try {
    socket = io(API_URL);

    socket.on('connect', () => {
      console.log('Socket connected');
      toast.success('Real-time connection established', {
        id: 'socket-connect',
        duration: 3000,
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      toast.error('Real-time connection lost', {
        id: 'socket-disconnect',
        duration: 3000,
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);

      // If we can't connect to the socket, set up a mock data interval
      if (!window.mockTransactionInterval) {
        console.warn('Using mock transaction stream due to socket connection error');
        toast('Using mock transaction data stream', {
          icon: '⚠️',
          id: 'socket-mock',
          duration: 4000,
        });

        // Send mock transaction every 5-10 seconds
        window.mockTransactionInterval = setInterval(() => {
          if (callback && typeof callback === 'function') {
            callback(generateMockTransaction());
          }
        }, 5000 + Math.random() * 5000);
      }
    });

    // Listen for new transactions
    socket.on('new_transaction', (transaction) => {
      if (callback && typeof callback === 'function') {
        callback(transaction);
      }
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);

    // Set up mock data interval if socket initialization fails
    if (!window.mockTransactionInterval) {
      console.warn('Using mock transaction stream due to socket initialization error');
      toast('Using mock transaction data stream', {
        icon: '⚠️',
        id: 'socket-mock',
        duration: 4000,
      });

      // Send mock transaction every 5-10 seconds
      window.mockTransactionInterval = setInterval(() => {
        if (callback && typeof callback === 'function') {
          callback(generateMockTransaction());
        }
      }, 5000 + Math.random() * 5000);
    }

    return null;
  }
};

// Clean up socket connection
export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
  }

  // Clear mock interval if it exists
  if (window.mockTransactionInterval) {
    clearInterval(window.mockTransactionInterval);
    window.mockTransactionInterval = null;
  }
};

export default {
  initSocket,
  closeSocket
};
