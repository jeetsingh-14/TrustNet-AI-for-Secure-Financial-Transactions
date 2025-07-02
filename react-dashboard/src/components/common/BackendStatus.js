import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { StatusBadge } from './';
import './BackendStatus.css';

/**
 * BackendStatus - A component to display backend connection status
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether the backend is connected
 * @param {string} props.label - Optional label to display next to the status indicator
 * @param {function} props.onStatusClick - Optional callback for when the status is clicked
 * @param {string} props.className - Additional CSS classes
 */
const BackendStatus = ({ 
  isConnected = false, 
  label = 'Backend', 
  onStatusClick, 
  className = '' 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Hide tooltip after 2 seconds
  useEffect(() => {
    let timer;
    if (showTooltip) {
      timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [showTooltip]);

  const handleClick = () => {
    setShowTooltip(true);
    if (onStatusClick) {
      onStatusClick();
    }
  };

  return (
    <div 
      className={`backend-status ${className}`}
      onClick={handleClick}
    >
      <StatusBadge 
        status={isConnected ? 'success' : 'danger'} 
        dot={true} 
        pulse={isConnected} 
        blink={!isConnected}
      />

      {label && <span className="backend-status-label">{label}</span>}

      {showTooltip && (
        <div className="backend-status-tooltip">
          {isConnected ? 'Connected' : 'Disconnected'} 
          <span className="text-xs block mt-1 opacity-70">
            {window.location.origin}/health
          </span>
        </div>
      )}
    </div>
  );
};

BackendStatus.propTypes = {
  isConnected: PropTypes.bool,
  label: PropTypes.string,
  onStatusClick: PropTypes.func,
  className: PropTypes.string
};

export default BackendStatus;
