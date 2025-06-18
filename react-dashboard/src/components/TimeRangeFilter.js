import React, { useState } from 'react';
import { 
  Dropdown, 
  Button, 
  ButtonGroup, 
  Form, 
  Row, 
  Col, 
  Modal 
} from 'react-bootstrap';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaFilter, 
  FaCheck 
} from 'react-icons/fa';
import { motion } from 'framer-motion';

const TimeRangeFilter = ({ currentRange, onRangeChange }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Get today's date in YYYY-MM-DD format for the date inputs
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate date 30 days ago in YYYY-MM-DD format
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoFormatted = thirtyDaysAgo.toISOString().split('T')[0];

  // Initialize custom date range when modal opens
  const handleOpenCustomModal = () => {
    setCustomStartDate(thirtyDaysAgoFormatted);
    setCustomEndDate(today);
    setShowCustomModal(true);
  };

  // Apply custom date range
  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      onRangeChange(`custom:${customStartDate}:${customEndDate}`);
      setShowCustomModal(false);
    }
  };

  // Get display text for current range
  const getRangeDisplayText = () => {
    if (currentRange.startsWith('custom:')) {
      const [, start, end] = currentRange.split(':');
      return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
    }
    
    switch (currentRange) {
      case '24h':
        return 'Last 24 Hours';
      case '7days':
        return 'Last 7 Days';
      case '30days':
        return 'Last 30 Days';
      default:
        return 'Select Time Range';
    }
  };

  return (
    <>
      <Dropdown as={ButtonGroup} className="time-range-filter">
        <Button 
          variant="outline-secondary" 
          className="d-flex align-items-center"
          disabled
        >
          <FaCalendarAlt className="me-2" />
          {getRangeDisplayText()}
        </Button>

        <Dropdown.Toggle split variant="outline-secondary" id="dropdown-time-range">
          <FaFilter />
        </Dropdown.Toggle>

        <Dropdown.Menu className="shadow-lg border-0">
          <Dropdown.Header>Select Time Range</Dropdown.Header>
          
          <motion.div whileHover={{ backgroundColor: '#f8f9fa' }}>
            <Dropdown.Item 
              onClick={() => onRangeChange('24h')}
              active={currentRange === '24h'}
              className="d-flex align-items-center"
            >
              <FaClock className="me-2" />
              Last 24 Hours
              {currentRange === '24h' && <FaCheck className="ms-auto" />}
            </Dropdown.Item>
          </motion.div>
          
          <motion.div whileHover={{ backgroundColor: '#f8f9fa' }}>
            <Dropdown.Item 
              onClick={() => onRangeChange('7days')}
              active={currentRange === '7days'}
              className="d-flex align-items-center"
            >
              <FaCalendarAlt className="me-2" />
              Last 7 Days
              {currentRange === '7days' && <FaCheck className="ms-auto" />}
            </Dropdown.Item>
          </motion.div>
          
          <motion.div whileHover={{ backgroundColor: '#f8f9fa' }}>
            <Dropdown.Item 
              onClick={() => onRangeChange('30days')}
              active={currentRange === '30days'}
              className="d-flex align-items-center"
            >
              <FaCalendarAlt className="me-2" />
              Last 30 Days
              {currentRange === '30days' && <FaCheck className="ms-auto" />}
            </Dropdown.Item>
          </motion.div>
          
          <Dropdown.Divider />
          
          <motion.div whileHover={{ backgroundColor: '#f8f9fa' }}>
            <Dropdown.Item 
              onClick={handleOpenCustomModal}
              active={currentRange.startsWith('custom:')}
              className="d-flex align-items-center"
            >
              <FaCalendarAlt className="me-2" />
              Custom Range
              {currentRange.startsWith('custom:') && <FaCheck className="ms-auto" />}
            </Dropdown.Item>
          </motion.div>
        </Dropdown.Menu>
      </Dropdown>

      {/* Custom Date Range Modal */}
      <Modal 
        show={showCustomModal} 
        onHide={() => setShowCustomModal(false)}
        centered
        className="custom-date-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Custom Date Range
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate || today}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={today}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCustomModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleApplyCustomRange}
            disabled={!customStartDate || !customEndDate}
          >
            Apply Range
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TimeRangeFilter;