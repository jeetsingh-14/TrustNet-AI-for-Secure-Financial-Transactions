import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * Standardized button component for consistent styling across the application
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon = null,
  className = '',
  ...props 
}) => {
  // Determine the appropriate button class based on variant and size
  const buttonClass = `trustnet-btn trustnet-btn-${variant} ${className}`;
  
  return (
    <BootstrapButton 
      variant={variant} 
      size={size} 
      className={buttonClass}
      {...props}
    >
      {icon && <span className="btn-icon me-2">{icon}</span>}
      {children}
    </BootstrapButton>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.string,
  size: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default Button;