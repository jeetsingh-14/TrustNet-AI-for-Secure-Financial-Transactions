import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import './InsightCard.css';

/**
 * InsightCard - A modern, reusable component for displaying analytics insights
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon to display (emoji or component)
 * @param {string} props.title - Title for the insight
 * @param {string|number} props.value - Value to display
 * @param {string} props.subtitle - Additional subtitle text
 */
const InsightCard = ({ 
  icon, 
  title, 
  value, 
  subtitle
}) => {
  // Format numbers with thousand separators
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat().format(value) 
    : value;

  return (
    <motion.div 
      className="bg-white shadow rounded-lg p-5 min-h-[160px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-blue-500 text-2xl">{icon}</span>
        <div>
          <h4 className="text-sm text-gray-600 font-semibold uppercase">{title}</h4>
          <h2 className="text-3xl font-bold text-blue-600">{formattedValue}</h2>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
};

InsightCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string
};

export default InsightCard;