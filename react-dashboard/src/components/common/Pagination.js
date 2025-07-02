import React from 'react';
import { Pagination as BootstrapPagination, Form, Dropdown } from 'react-bootstrap';
import PropTypes from 'prop-types';
import './Pagination.css';

/**
 * Reusable pagination component with consistent styling
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Number of items per page
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onItemsPerPageChange - Callback when items per page changes
 * @param {string} props.className - Additional CSS classes
 */
const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
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

  // Calculate the range of items being displayed
  const startItem = Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1);
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  return (
    <div className={`pagination-container ${className}`}>
      <div className="pagination-info">
        Showing {startItem}–{endItem} of {totalItems}
      </div>

      <BootstrapPagination className="trustnet-pagination">
        {items}
      </BootstrapPagination>

      {onItemsPerPageChange && (
        <div className="rows-per-page">
          <span>Rows per page:</span>
          <Form.Select 
            size="sm"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="rows-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </Form.Select>
        </div>
      )}
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number,
  itemsPerPage: PropTypes.number,
  onPageChange: PropTypes.func.isRequired,
  onItemsPerPageChange: PropTypes.func,
  className: PropTypes.string
};

export default Pagination;
