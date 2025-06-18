import React from 'react';
import { Card as BootstrapCard } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Card.css';

/**
 * Standardized card component for consistent styling across the application
 */
const Card = ({ 
  children, 
  title = null,
  variant = 'default',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  ...props 
}) => {
  const cardClass = `trustnet-card trustnet-card-${variant} ${className}`;
  const headerClass = `trustnet-card-header ${headerClassName}`;
  const bodyClass = `trustnet-card-body ${bodyClassName}`;
  
  return (
    <BootstrapCard className={cardClass} {...props}>
      {title && (
        <BootstrapCard.Header className={headerClass}>
          {title}
        </BootstrapCard.Header>
      )}
      <BootstrapCard.Body className={bodyClass}>
        {children}
      </BootstrapCard.Body>
    </BootstrapCard>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'primary', 'secondary', 'success', 'danger', 'warning']),
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string
};

export default Card;