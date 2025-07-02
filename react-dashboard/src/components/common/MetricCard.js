import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import './MetricCard.css';

/**
 * MetricCard - A modern, reusable component for displaying metrics in a dashboard
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon to display (emoji or component)
 * @param {string} props.title - Title for the metric
 * @param {string|number} props.value - Value to display
 * @param {string} props.description - Additional description text
 * @param {string} props.variant - Visual variant (success, danger, warning, neutral)
 */
const MetricCard = ({ 
  icon, 
  title, 
  value, 
  description, 
  variant = 'neutral' 
}) => {
  // Format numbers with thousand separators
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat().format(value) 
    : value;

  return (
    <motion.div 
      className={`metric-card ${variant}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="metric-card-content">
        <div className="metric-card-icon">
          {icon}
        </div>
        
        <div className="metric-card-body">
          <div className="metric-card-value">
            {formattedValue}
          </div>
          
          <div className="metric-card-title">
            {title}
          </div>
          
          {description && (
            <div className="metric-card-description">
              {description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

MetricCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string,
  variant: PropTypes.oneOf(['success', 'danger', 'warning', 'neutral'])
};

export default MetricCard;