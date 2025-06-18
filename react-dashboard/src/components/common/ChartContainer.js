import React from 'react';
import PropTypes from 'prop-types';
import { Card } from './index';
import './ChartContainer.css';

/**
 * Standardized chart container component for consistent chart styling
 */
const ChartContainer = ({ 
  title, 
  children,
  variant = 'primary',
  className = '',
  height = 300,
  ...props 
}) => {
  return (
    <Card 
      title={title}
      variant={variant}
      className={`chart-container-card ${className}`}
      {...props}
    >
      <div className="chart-container" style={{ height: `${height}px` }}>
        {children}
      </div>
    </Card>
  );
};

ChartContainer.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  variant: PropTypes.string,
  className: PropTypes.string,
  height: PropTypes.number
};

export default ChartContainer;