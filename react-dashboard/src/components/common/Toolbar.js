import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import './Toolbar.css';

/**
 * Toolbar - A reusable component for dashboard toolbars
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Toolbar content (buttons, filters, etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.position - Position of the toolbar (right, left, center)
 */
const Toolbar = ({ 
  children, 
  className = '', 
  position = 'right' 
}) => {
  return (
    <motion.div 
      className={`dashboard-toolbar ${position} ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="toolbar-content">
        {children}
      </div>
    </motion.div>
  );
};

/**
 * ToolbarButton - A button component for the toolbar
 */
export const ToolbarButton = ({ 
  icon, 
  label, 
  onClick, 
  variant = 'default', 
  className = '',
  disabled = false
}) => {
  return (
    <button 
      className={`toolbar-button ${variant} ${className}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {label && <span className="button-label">{label}</span>}
    </button>
  );
};

/**
 * ToolbarDivider - A simple divider for the toolbar
 */
export const ToolbarDivider = () => {
  return <div className="toolbar-divider"></div>;
};

/**
 * ToolbarGroup - A group of related toolbar items
 */
export const ToolbarGroup = ({ children, className = '' }) => {
  return (
    <div className={`toolbar-group ${className}`}>
      {children}
    </div>
  );
};

Toolbar.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  position: PropTypes.oneOf(['right', 'left', 'center'])
};

ToolbarButton.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'danger', 'warning', 'info']),
  className: PropTypes.string,
  disabled: PropTypes.bool
};

ToolbarGroup.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Toolbar;