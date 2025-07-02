import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-hot-toast';
import { 
  Home, 
  BarChart3, 
  Shield, 
  PieChart,
  Menu,
  X,
  ArrowLeftRight
} from 'lucide-react';
  FaHome, 
  FaExchangeAlt, 
  FaChartBar,
  FaBars,
  FaTimes,
  FaUserShield
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ onCollapse, initialCollapsed = false }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      const parsedState = JSON.parse(savedState);
      setIsCollapsed(parsedState);
      if (onCollapse) onCollapse(parsedState);
    }
  }, [onCollapse]);

  // We don't want to update isCollapsed when initialCollapsed prop changes
  // This ensures sidebar state persists unless manually toggled
  // Update when initialCollapsed prop changes
  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    if (onCollapse) onCollapse(isCollapsed);
  }, [isCollapsed, onCollapse]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    // Show toast notification
    toast.success(newState ? 'Sidebar collapsed' : 'Sidebar expanded', {
      icon: newState ? '📱' : '📋',
      duration: 2000,
    });
    // onCollapse callback is handled in the effect above
  };

  // Animation variants for menu items
  const navItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({ 
      opacity: 1, 
      x: 0,
      transition: { 
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut" 
      }
    })
  };

  // Navigation items
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: Home, isActive: location.pathname === '/' || location.pathname === '/dashboard' },
    { path: '/transactions', name: 'Transactions', icon: ArrowLeftRight, isActive: location.pathname.includes('/transactions') },
    { path: '/analytics', name: 'Analytics', icon: BarChart3, isActive: location.pathname === '/analytics' },
    { path: '/reports', name: 'Reports', icon: PieChart, isActive: location.pathname === '/reports' },
    { path: '/security', name: 'Security', icon: Shield, isActive: location.pathname === '/security' }
  ];

  return (
    <div className={`sidebar glass-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
    { path: '/', name: 'Dashboard', icon: FaHome, isActive: location.pathname === '/' || location.pathname === '/dashboard' },
    { path: '/transactions', name: 'Transactions', icon: FaExchangeAlt, isActive: location.pathname.includes('/transactions') },
    { path: '/analytics', name: 'Analytics', icon: FaChartBar, isActive: location.pathname === '/analytics' }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="toggle-btn"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-tooltip-id="sidebar-toggle-tooltip"
          data-tooltip-content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </motion.button>
        <Tooltip id="sidebar-toggle-tooltip" place="right" />
      </div>

      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {navItems.map((item, i) => (
            <motion.div
              key={item.path}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={navItemVariants}
              whileHover={{ scale: 1.05 }}
              className="nav-item-container"
            >
              <Link 
                to={item.path} 
                className={`nav-item ${item.isActive ? 'active' : ''}`}
                data-tooltip-id={`nav-tooltip-${i}`}
                data-tooltip-content={item.name}
              >
                <item.icon className="nav-icon" size={20} />
                <item.icon className="nav-icon" />
                {!isCollapsed && <span className="nav-text">{item.name}</span>}
              </Link>
              {isCollapsed && <Tooltip id={`nav-tooltip-${i}`} place="right" />}
            </motion.div>
          ))}
        </nav>
      </div>

      {/* Footer section removed as Access Control has been moved to the navbar */}
      <div className="sidebar-footer">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="nav-item-container"
        >
          <Link 
            to="#" 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              // This would typically open the RBAC modal
              toast.success('Access Control button clicked', {
                icon: '🔐',
                duration: 2000,
              });
            }}
            data-tooltip-id="access-control-tooltip"
            data-tooltip-content="Access Control"
          >
            <FaUserShield className="nav-icon" />
            {!isCollapsed && <span className="nav-text">Access Control</span>}
          </Link>
          {isCollapsed && <Tooltip id="access-control-tooltip" place="right" />}
        </motion.div>
      </div>
    </div>
  );
};

export default Sidebar;
