import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Pagination.css';

/**
 * Reusable pagination component with consistent styling
 */
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = '' 
}) => {
  const items = [];

  // Previous button
  items.push(
    <BootstrapPagination.Prev 
      key="prev"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
    />
  );

  // First page
  items.push(
    <BootstrapPagination.Item
      key={1}
      active={currentPage === 1}
      onClick={() => onPageChange(1)}
    >
      1
    </BootstrapPagination.Item>
  );

  // Ellipsis if needed
  if (currentPage > 3) {
    items.push(<BootstrapPagination.Ellipsis key="ellipsis1" disabled />);
  }

  // Pages around current page
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) {
    items.push(
      <BootstrapPagination.Item
        key={page}
        active={page === currentPage}
        onClick={() => onPageChange(page)}
      >
        {page}
      </BootstrapPagination.Item>
    );
  }

  // Ellipsis if needed
  if (currentPage < totalPages - 2) {
    items.push(<BootstrapPagination.Ellipsis key="ellipsis2" disabled />);
  }

  // Last page if not the first page
  if (totalPages > 1) {
    items.push(
      <BootstrapPagination.Item
        key={totalPages}
        active={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        {totalPages}
      </BootstrapPagination.Item>
    );
  }

  // Next button
  items.push(
    <BootstrapPagination.Next
      key="next"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    />
  );

  return (
    <BootstrapPagination className={`trustnet-pagination ${className}`}>
      {items}
    </BootstrapPagination>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default Pagination;