import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetail from './pages/TransactionDetail';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  const handleSidebarCollapse = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <Router>
      <div className="App">
        <Navigation />
        <Sidebar onCollapse={handleSidebarCollapse} initialCollapsed={isSidebarCollapsed} />
        <div className={`content-with-sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="content-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:id" element={<TransactionDetail />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </div>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: 'var(--success-color)',
              },
            },
            error: {
              style: {
                background: 'var(--danger-color)',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;

// Project by Jeet Singh Saini
