import React from 'react';
import PropTypes from 'prop-types';
import './StatusBadge.css';

/**
 * StatusBadge - A reusable component for displaying status indicators
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - The status to display (success, warning, danger, info, neutral)
 * @param {string} props.text - The text to display in the badge
 * @param {boolean} props.dot - Whether to show a dot indicator instead of text
 * @param {boolean} props.pulse - Whether to add a pulsing animation to the badge
 * @param {boolean} props.blink - Whether to add a blinking animation to the badge
 * @param {string} props.className - Additional CSS classes
 */
const StatusBadge = ({ 
  status = 'neutral', 
  text, 
  dot = false, 
  pulse = false,
  blink = false,
  className = '' 
}) => {
  return (
    <div className={`status-badge ${status} ${dot ? 'dot' : ''} ${pulse ? 'pulse' : ''} ${blink ? 'blink' : ''} ${className}`}>
      {!dot && text && <span className="status-text">{text}</span>}
    </div>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'neutral']),
  text: PropTypes.string,
  dot: PropTypes.bool,
  pulse: PropTypes.bool,
  blink: PropTypes.bool,
  className: PropTypes.string
};

export default StatusBadge;
