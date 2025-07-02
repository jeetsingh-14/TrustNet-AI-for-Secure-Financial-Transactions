import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import './KPIWidget.css';

/**
 * KPIWidget - A reusable component for displaying key performance indicators
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon to display (emoji or component)
 * @param {string} props.label - Label for the KPI
 * @param {string|number} props.value - Value to display
 * @param {string} props.trend - Trend indicator (e.g., "+3.5%")
 * @param {string} props.description - Additional description text
 * @param {string} props.color - Color theme for the widget (primary, success, danger, warning, info)
 */
const KPIWidget = ({ 
  icon, 
  label, 
  value, 
  trend, 
  description, 
  color = 'primary' 
}) => {
  // Format numbers with thousand separators
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat().format(value) 
    : value;

  // Determine trend direction for styling
  const isTrendUp = trend && trend.startsWith('+');
  const isTrendDown = trend && trend.startsWith('-');
  const trendClass = isTrendUp ? 'trend-up' : isTrendDown ? 'trend-down' : 'trend-neutral';

  return (
    <motion.div 
      className={`kpi-widget ${color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="kpi-widget-content">
        <div className="kpi-widget-header">
          <div className="kpi-widget-icon">
            {icon}
          </div>
          <div className="kpi-widget-label">
            {label}
          </div>
        </div>
        
        <div className="kpi-widget-body">
          <div className="kpi-widget-value">
            {formattedValue}
          </div>
          
          {trend && (
            <div className={`kpi-widget-trend ${trendClass}`}>
              {trend}
            </div>
          )}
        </div>
        
        {description && (
          <div className="kpi-widget-description">
            {description}
          </div>
        )}
      </div>
    </motion.div>
  );
};

KPIWidget.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.string,
  description: PropTypes.string,
  color: PropTypes.oneOf(['primary', 'success', 'danger', 'warning', 'info', 'neutral'])
};

export default KPIWidget;