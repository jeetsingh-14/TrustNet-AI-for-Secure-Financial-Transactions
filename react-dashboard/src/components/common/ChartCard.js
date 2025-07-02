import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Dropdown } from 'react-bootstrap';
import { FaEllipsisV, FaDownload, FaFileCsv, FaFileExcel, FaImage } from 'react-icons/fa';
import './ChartCard.css';

/**
 * ChartCard - A reusable component for displaying charts in a clean, card-style layout
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title for the chart
 * @param {React.ReactNode} props.children - Chart content
 * @param {React.ReactNode} props.toolbar - Optional toolbar content
 * @param {string} props.footer - Optional footer text
 * @param {Function} props.onExport - Optional function to call when export is clicked
 * @param {Object} props.chartRef - Optional ref to the chart component for export functionality
 */
const ChartCard = ({ 
  title, 
  children, 
  toolbar, 
  footer,
  onExport,
  chartRef
}) => {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">{title}</h3>
        <div className="chart-card-actions">
          {toolbar}
          
          {onExport && (
            <Dropdown align="end">
              <Dropdown.Toggle variant="light" size="sm" id="dropdown-export" className="chart-export-btn">
                <FaDownload className="me-1" size={14} />
                <span className="d-none d-md-inline">Export</span>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {chartRef && (
                  <Dropdown.Item onClick={() => onExport('image')}>
                    <FaImage className="me-2" size={14} /> Image (.png)
                  </Dropdown.Item>
                )}
                <Dropdown.Item onClick={() => onExport('csv')}>
                  <FaFileCsv className="me-2" size={14} /> CSV
                </Dropdown.Item>
                <Dropdown.Item onClick={() => onExport('excel')}>
                  <FaFileExcel className="me-2" size={14} /> Excel
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>
      
      <div className="chart-card-body">
        {children}
      </div>
      
      {footer && (
        <div className="chart-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  toolbar: PropTypes.node,
  footer: PropTypes.node,
  onExport: PropTypes.func,
  chartRef: PropTypes.object
};

export default ChartCard;