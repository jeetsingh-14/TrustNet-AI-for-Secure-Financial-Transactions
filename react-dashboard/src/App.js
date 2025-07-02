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
import Reports from './pages/Reports';
import Security from './pages/Security';
import config from './config';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  const [backendUrl, setBackendUrl] = useState(config.backend.url);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }

    // Check backend connection
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(config.backend.healthCheckUrl, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "ok") {
            setBackendConnected(true);
          } else {
            setBackendConnected(false);
          }
        } else {
          setBackendConnected(false);
        }
      } catch (error) {
        console.error('Backend connection check failed:', error);
        setBackendConnected(false);
      }
    };

    // Initial check
    checkBackendConnection();

    // Set up periodic checks
    const intervalId = setInterval(checkBackendConnection, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [backendUrl]);

  const handleSidebarCollapse = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <Router>
      <div className="App">
        <div className="app-layout">
          {/* Fixed Sidebar */}
          <div className="app-sidebar">
            <Sidebar onCollapse={handleSidebarCollapse} initialCollapsed={isSidebarCollapsed} />
          </div>

          <div className="app-main">
            {/* Top Navbar */}
            <div className="app-navbar">
              <Navigation 
                backendConnected={backendConnected} 
                backendUrl={backendUrl} 
              />
            </div>

            {/* Main Content Area */}
            <div className={`app-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
              <div className="content-container">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/transactions/:id" element={<TransactionDetail />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/security" element={<Security />} />
                </Routes>
              </div>
            </div>
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
