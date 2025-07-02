import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * KPICard - A reusable component for displaying key performance indicators
 * with a clean, enterprise-grade design using Tailwind CSS
 * 
 * @param {Object} props - Component props
 * @param {string|React.ReactNode} props.icon - Icon to display
 * @param {string} props.title - Title for the KPI
 * @param {string|number} props.value - Value to display
 * @param {string} props.subtitle - Additional description or trend text
 * @param {string} props.color - Color theme for the card (primary, success, danger, warning, info)
 * @param {string} props.tooltip - Optional tooltip text
 */
const KPICard = ({ 
  icon, 
  title, 
  value, 
  subtitle,
  color = 'primary',
  tooltip
}) => {
  // Format numbers with thousand separators
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat().format(value) 
    : value;

  // Determine if subtitle contains trend information
  const hasTrend = subtitle && (subtitle.includes('+') || subtitle.includes('-'));

  // Map color prop to Tailwind classes
  const colorClasses = {
    primary: 'text-blue-500 bg-blue-50',
    success: 'text-green-500 bg-green-50',
    danger: 'text-red-500 bg-red-50',
    warning: 'text-orange-500 bg-orange-50',
    info: 'text-indigo-500 bg-indigo-50'
  };

  const iconColorClass = colorClasses[color] || colorClasses.primary;

  // Determine trend classes
  const trendClasses = hasTrend 
    ? subtitle.startsWith('+') 
      ? 'bg-green-50 text-green-600' 
      : subtitle.startsWith('-') 
        ? 'bg-red-50 text-red-600' 
        : 'bg-gray-50 text-gray-600'
    : 'bg-gray-50 text-gray-600';

  const card = (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:bg-gray-50 transition-all duration-300 min-h-[140px] flex flex-col animate-fade-in">
      <div className="flex items-center space-x-3 mb-2">
        <div className={`p-2 rounded-full ${iconColorClass}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
      {subtitle && (
        <p className={`text-xs rounded-full px-2 py-1 mt-1 inline-flex items-center ${trendClasses}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip>{tooltip}</Tooltip>}
      >
        {card}
      </OverlayTrigger>
    );
  }

  return card;
};

KPICard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  color: PropTypes.oneOf(['primary', 'success', 'danger', 'warning', 'info']),
  tooltip: PropTypes.string
};

export default KPICard;
