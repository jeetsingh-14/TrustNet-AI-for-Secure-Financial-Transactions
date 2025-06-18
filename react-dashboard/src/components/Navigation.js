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
          {/* System Status */}
          <motion.div 
            className="status-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
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
    </Navbar>
  );
};

export default Navigation;
