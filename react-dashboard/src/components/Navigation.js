
import React, { useState, useEffect, useRef } from 'react';
import { Navbar, Nav, Dropdown, Badge, Button } from 'react-bootstrap';

import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Dropdown, Badge } from 'react-bootstrap';

import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { 
  FaUser, 
  FaBell, 
  FaCog, 
  FaSignOutAlt, 
  FaQuestionCircle,
  FaMoon,
  FaSun,

  FaUserShield,
  FaCircle,
  FaClock,
  FaCheck
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import RoleBasedAccessControlModal from './RoleBasedAccessControlModal';
import config from '../config';
import './Navigation.css';

const Navigation = ({ backendConnected = true, backendUrl = config.backend.url }) => {
  const [currentTheme, setCurrentTheme] = useState('light');

} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './Navigation.css';

const Navigation = () => {
  const [darkMode, setDarkMode] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, text: "New fraud alert detected", time: "5 minutes ago", read: false },
    { id: 2, text: "System update completed", time: "1 hour ago", read: false },
    { id: 3, text: "Weekly security report available", time: "1 day ago", read: true }
  ]);


  // Available themes
  const themes = [
    { id: 'light', name: 'Light', icon: <FaSun /> },
    { id: 'dark', name: 'Dark', icon: <FaMoon /> },
    { id: 'system', name: 'System', icon: <FaCog /> }
  ];

  // Session timer state
  const [sessionTimeLeft, setSessionTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const timerRef = useRef(null);

  // RBAC modal state
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

  // Effect to apply theme to the document
  useEffect(() => {
    // Remove all theme classes first
    document.body.classList.remove('dark-mode', 'light-mode', 'system-mode');

    if (currentTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else if (currentTheme === 'light') {
      document.body.classList.add('light-mode');
    } else if (currentTheme === 'system') {
      // Check system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(prefersDarkMode ? 'dark-mode' : 'light-mode');
      document.body.classList.add('system-mode');
    }

    // Save theme preference
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  // Effect to load saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Session timer effect
  useEffect(() => {
    // Start the countdown
    timerRef.current = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.error('Your session has expired. Please log in again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const changeTheme = (themeId) => {
    setCurrentTheme(themeId);
    toast.success(`${themeId.charAt(0).toUpperCase() + themeId.slice(1)} theme activated`);

  // Effect to apply dark mode to the document
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    toast.success(`${newMode ? 'Dark' : 'Light'} mode activated`);

  };

  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Format session time
  const formatSessionTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Navbar variant="light" className={`navbar-custom glass-navbar ${currentTheme === 'dark' ? 'dark-mode' : ''}`}>
  return (
    <Navbar variant="dark" className={`navbar-custom ${darkMode ? 'dark-mode' : ''}`}>
      <div className="navbar-content">
        {/* Left section - Logo */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <motion.div
            className="brand-logo-container"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img 
              src="/logo192.png"
              alt="TrustNet AI Logo" 
              className="brand-icon" 
            />
          </motion.div>
          <span className="brand-text ms-2 d-none d-md-inline">TrustNet AI</span>
        </Navbar.Brand>

        {/* Right section - utility icons with flex-end alignment */}
        <Nav className="navbar-items">
          {/* Backend Connection Status */}
          {/* System Status */}
          <motion.div 
            className="status-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            data-tooltip-id="backend-tooltip"
            data-tooltip-content={`Backend: ${backendConnected ? 'Connected' : 'Disconnected'} | Health check: ${config.backend.healthCheckUrl}`}
          >
            <div className={`status-indicator ${backendConnected ? 'connected' : 'disconnected'}`}>
              <FaCircle size={10} />
            </div>
            <span className="d-none d-md-inline">
              Backend: <span className={`status-text ${backendConnected ? 'text-success' : 'text-danger'}`}>
                {backendConnected ? 'Connected' : 'Disconnected'}
              </span>
            </span>
          </motion.div>
          <Tooltip id="backend-tooltip" place="bottom" />

          {/* Session Timer */}
          <motion.div 
            className="session-timer-container ms-3 me-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            data-tooltip-id="session-tooltip"
            data-tooltip-content="Time until session expires"
          >
            <FaClock size={14} />
            <span className="session-timer">{formatSessionTime(sessionTimeLeft)}</span>
          </motion.div>
          <Tooltip id="session-tooltip" place="bottom" />

          {/* Theme Selector Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle 
              as="div" 
              id="theme-dropdown" 
              className="theme-toggle-btn"
              data-tooltip-id="theme-tooltip"
              data-tooltip-content="Change theme"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="theme-icon-container"
              >
                {currentTheme === 'dark' ? (
                  <FaMoon className="text-warning" />
                ) : currentTheme === 'system' ? (
                  <FaCog />
                ) : (
                  <FaSun className="text-warning" />
                )}
              </motion.div>
            </Dropdown.Toggle>
            <Tooltip id="theme-tooltip" place="bottom" />

            <Dropdown.Menu className="theme-menu">
              <div className="theme-header">
                <h6 className="mb-0">Select Theme</h6>
              </div>
              <Dropdown.Divider />
              {themes.map((theme) => (
                <Dropdown.Item 
                  key={theme.id}
                  onClick={() => changeTheme(theme.id)}
                  className={`theme-item ${currentTheme === theme.id ? 'active' : ''}`}
                >
                  <div className="theme-item-icon">
                    {theme.icon}
                  </div>
                  <span className="theme-item-text">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <div className="theme-item-check">
                      <FaCheck size={12} />
                    </div>
                  )}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
            data-tooltip-id="status-tooltip"
            data-tooltip-content="System is online and operational"
          >
            <div className="status-indicator me-2"></div>
            <span className="d-none d-md-inline">System Status: <span className="status-text font-semibold">Online</span></span>
          </motion.div>
          <Tooltip id="status-tooltip" place="bottom" />

          {/* Dark Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="theme-toggle-btn"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            data-tooltip-id="theme-tooltip"
            data-tooltip-content={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun className="text-warning" /> : <FaMoon />}
          </motion.button>
          <Tooltip id="theme-tooltip" place="bottom" />

          {/* Notifications Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle 
              as="div" 
              id="notification-dropdown" 
              className="notification-toggle"
              data-tooltip-id="notification-tooltip"
              data-tooltip-content={`${unreadCount} unread notifications`}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="notification-icon-container"
              >
                <FaBell className="notification-icon" />
                {unreadCount > 0 && (
                  <Badge pill bg="danger" className="notification-badge">
                    {unreadCount}
                  </Badge>
                )}
              </motion.div>
            </Dropdown.Toggle>
            <Tooltip id="notification-tooltip" place="bottom" />

            <Dropdown.Menu className="notification-menu">
              <div className="notification-header">
                <h6 className="mb-0">Notifications</h6>
                {unreadCount > 0 && (
                  <button 
                    className="mark-read-btn"
                    onClick={markAllNotificationsAsRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <Dropdown.Divider />
              {notifications.length > 0 ? (
                <div className="notification-list">
                  <AnimatePresence>
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      >
                        <div className="notification-content">
                          <p className="notification-text">{notification.text}</p>
                          <small className="notification-time">{notification.time}</small>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="empty-notifications">
                  <p className="text-center mb-0">No notifications</p>
                </div>
              )}
              <Dropdown.Divider />
              <div className="text-center">
                <Link to="/notifications" className="view-all-link">
                  View all notifications
                </Link>
              </div>
            </Dropdown.Menu>
          </Dropdown>

          {/* Access Control Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="me-3"
          >
            <Button 
              variant="outline-light" 
              size="sm"
              className="d-flex align-items-center"
              onClick={() => setShowRbacModal(true)}
            >
              <FaUserShield className="me-1" />
              <span className="d-none d-md-inline">Access Control</span>
            </Button>
          </motion.div>

          {/* User Profile Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle 
              as="div" 
              id="user-dropdown" 
              className="user-toggle"
              data-tooltip-id="user-tooltip"
              data-tooltip-content="User profile and settings"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="user-avatar"
              >
                <FaUser />
              </motion.div>
            </Dropdown.Toggle>
            <Tooltip id="user-tooltip" place="bottom" />

            <Dropdown.Menu className="user-menu">
              <div className="user-info">
                <h6 className="mb-0">John Doe</h6>
                <small className="text-muted">Administrator</small>
              </div>
              <Dropdown.Divider />
              <Dropdown.Item as={Link} to="/profile" className="dropdown-item">
                <FaUser className="dropdown-icon" /> Profile
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/settings" className="dropdown-item">
                <FaCog className="dropdown-icon" /> Settings
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/help" className="dropdown-item">
                <FaQuestionCircle className="dropdown-icon" /> Help & Support
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item as={Link} to="/logout" className="dropdown-item text-danger">
                <FaSignOutAlt className="dropdown-icon" /> Sign Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </div>

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
    </Navbar>
  );
};

export default Navigation;
