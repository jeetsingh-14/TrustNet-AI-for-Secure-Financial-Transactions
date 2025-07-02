import React from 'react';
import PropTypes from 'prop-types';
import './SectionHeader.css';

/**
 * SectionHeader - A reusable component for section headers in the dashboard
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - The section title
 * @param {React.ReactNode} props.icon - Optional icon to display next to the title
 * @param {React.ReactNode} props.actions - Optional actions (buttons, links, etc.) to display on the right
 * @param {string} props.description - Optional description text to display below the title
 * @param {string} props.className - Additional CSS classes
 */
const SectionHeader = ({ 
  title, 
  icon, 
  actions, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`section-header ${className}`}>
      <div className="section-header-main">
        <div className="section-header-title-container">
          {icon && <div className="section-header-icon">{icon}</div>}
          <h2 className="section-header-title">{title}</h2>
        </div>
        
        {actions && (
          <div className="section-header-actions">
            {actions}
          </div>
        )}
      </div>
      
      {description && (
        <div className="section-header-description">
          {description}
        </div>
      )}
    </div>
  );
};

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  actions: PropTypes.node,
  description: PropTypes.string,
  className: PropTypes.string
};

export default SectionHeader;