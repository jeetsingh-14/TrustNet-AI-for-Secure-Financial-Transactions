import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Table, 
  Badge, 
  Form, 
  Button, 
  Row, 
  Col, 
  Pagination,
  Alert,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaFilter, FaSync, FaPause, FaPlay, FaArrowDown } from 'react-icons/fa';
import { getTransactions } from '../services/api';
import { initSocket, closeSocket } from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';
import './TransactionsPage.css';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // References for auto-scroll
  const tableRef = useRef(null);
  const tableBodyRef = useRef(null);

  // Live feed state
  const [autoScroll, setAutoScroll] = useState(true);
  const [newTransactionCount, setNewTransactionCount] = useState(0);
  const [lastTransactionId, setLastTransactionId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [filters, setFilters] = useState({
    transactionType: '',
    minAmount: '',
    maxAmount: '',
    accountId: '',
    isFraud: ''
  });

  // Get filter parameters for API request
  const getFilterParams = useCallback(() => {
    const params = {};

    if (filters.transactionType) {
      params.transaction_type = filters.transactionType;
    }

    if (filters.minAmount) {
      params.min_amount = parseFloat(filters.minAmount);
    }

    if (filters.maxAmount) {
      params.max_amount = parseFloat(filters.maxAmount);
    }

    if (filters.accountId) {
      params.account_id = filters.accountId;
    }

    if (filters.isFraud !== '') {
      params.is_fraud = filters.isFraud === 'true';
    }

    return params;
  }, [filters]);

  // Fetch transactions with filters and pagination
  const fetchTransactions = useCallback(async (page = 1, size = 20, filterParams = {}) => {
    try {
      setLoading(true);

      // Build query parameters
      const params = {
        offset: (page - 1) * size,
        limit: size,
        ...filterParams
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      // Make API request using our API service
      const response = await getTransactions(params);

      // Update state
      setTransactions(response.data);

      // Calculate total pages (assuming API returns total count in headers)
      const totalCount = parseInt(response.headers['x-total-count'] || '0', 10);
      setTotalPages(Math.ceil(totalCount / size) || 1);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again later.');
      setLoading(false);
    }
  }, []);

  // Handle new transaction from WebSocket
  const handleNewTransaction = useCallback((transaction) => {
    // Check if this transaction is already in our list
    setTransactions(prevTransactions => {
      if (prevTransactions.some(t => t.transaction_id === transaction.transaction_id)) {
        return prevTransactions;
      }

      // Update last transaction ID
      setLastTransactionId(transaction.transaction_id);

      // Only keep the most recent transactions to avoid performance issues
      const maxTransactions = pageSize * 2;
      const updatedTransactions = [transaction, ...prevTransactions];

      if (updatedTransactions.length > maxTransactions) {
        return updatedTransactions.slice(0, maxTransactions);
      }

      return updatedTransactions;
    });

    // If auto-scroll is off, increment the new transaction counter
    if (!autoScroll) {
      setNewTransactionCount(prev => prev + 1);
    }

    // Auto-scroll to the new transaction if enabled
    if (autoScroll && tableBodyRef.current) {
      setTimeout(() => {
        tableBodyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoScroll, pageSize]); // Removed transactions from dependencies

  // Scroll to the latest transactions
  const scrollToLatest = useCallback(() => {
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setNewTransactionCount(0);
  }, []);

  // Toggle auto-scroll
  const toggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => !prev);
    if (!autoScroll) {
      // If turning auto-scroll on, reset new transaction count and scroll to latest
      setNewTransactionCount(0);
      scrollToLatest();
    }
  }, [autoScroll, scrollToLatest]);

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    // Fetch initial transactions only once on mount
    const initialPage = 1;
    const initialPageSize = 20;
    fetchTransactions(initialPage, initialPageSize);

    // Initialize WebSocket connection
    const socket = initSocket(handleNewTransaction);

    // Clean up WebSocket connection on unmount
    return () => {
      closeSocket();
    };
  }, []); // Empty dependency array to run only once on mount

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchTransactions(page, pageSize, getFilterParams());
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchTransactions(1, pageSize, getFilterParams());
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      transactionType: '',
      minAmount: '',
      maxAmount: '',
      accountId: '',
      isFraud: ''
    });
    setCurrentPage(1);
    fetchTransactions(1, pageSize);
  };

  // Handle row click to navigate to transaction details
  const handleRowClick = (transactionId) => {
    navigate(`/transactions/${transactionId}`);
  };

  // Render pagination controls
  const renderPagination = () => {
    const items = [];

    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    // First page
    items.push(
      <Pagination.Item
        key={1}
        active={currentPage === 1}
        onClick={() => handlePageChange(1)}
      >
        1
      </Pagination.Item>
    );

    // Ellipsis if needed
    if (currentPage > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
    }

    // Pages around current page
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    // Ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
    }

    // Last page if not the first page
    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={currentPage === totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  return (
    <div className="transactions-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Transaction Management</h1>
        <div className="d-flex">
          {/* Auto-scroll toggle button */}
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>{autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}</Tooltip>}
          >
            <Button 
              variant={autoScroll ? "outline-secondary" : "outline-success"}
              className="me-2"
              onClick={toggleAutoScroll}
            >
              {autoScroll ? <FaPause className="me-1" /> : <FaPlay className="me-1" />}
              {autoScroll ? 'Pause Live Feed' : 'Resume Live Feed'}
            </Button>
          </OverlayTrigger>

          {/* New transactions notification */}
          {!autoScroll && newTransactionCount > 0 && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Scroll to latest transactions</Tooltip>}
            >
              <Button 
                variant="primary"
                className="me-2 position-relative"
                onClick={scrollToLatest}
              >
                <FaArrowDown className="me-1" /> New Transactions
                <Badge 
                  bg="danger" 
                  pill 
                  className="position-absolute top-0 start-100 translate-middle"
                >
                  {newTransactionCount}
                </Badge>
              </Button>
            </OverlayTrigger>
          )}

          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => fetchTransactions(currentPage, pageSize, getFilterParams())}
          >
            <FaSync className="me-1" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="summary-card bg-light">
            <Card.Body className="text-center">
              <h3 className="text-primary mb-0">{transactions.length}</h3>
              <p className="text-muted mb-0">Transactions Loaded</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-light">
            <Card.Body className="text-center">
              <h3 className="text-success mb-0">
                ${transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
              </h3>
              <p className="text-muted mb-0">Total Amount</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-light">
            <Card.Body className="text-center">
              <h3 className="text-danger mb-0">
                {transactions.filter(t => t.is_fraud).length}
              </h3>
              <p className="text-muted mb-0">Fraudulent Transactions</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="summary-card bg-light">
            <Card.Body className="text-center">
              <h3 className="text-warning mb-0">
                {transactions.length > 0 ? 
                  ((transactions.filter(t => t.is_fraud).length / transactions.length) * 100).toFixed(2) + '%' : 
                  '0%'
                }
              </h3>
              <p className="text-muted mb-0">Fraud Rate</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 filter-card shadow-sm">
        <Card.Header className="bg-primary text-white">
          <FaFilter className="me-2" /> Advanced Filters
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Transaction Type</Form.Label>
                <Form.Select
                  name="transactionType"
                  value={filters.transactionType}
                  onChange={handleFilterChange}
                  className="form-control-solid"
                >
                  <option value="">All Types</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="CASH_OUT">Cash Out</option>
                  <option value="DEBIT">Debit</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Min Amount</Form.Label>
                <Form.Control
                  type="number"
                  name="minAmount"
                  value={filters.minAmount}
                  onChange={handleFilterChange}
                  placeholder="Min"
                  className="form-control-solid"
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Max Amount</Form.Label>
                <Form.Control
                  type="number"
                  name="maxAmount"
                  value={filters.maxAmount}
                  onChange={handleFilterChange}
                  placeholder="Max"
                  className="form-control-solid"
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Account ID</Form.Label>
                <Form.Control
                  type="text"
                  name="accountId"
                  value={filters.accountId}
                  onChange={handleFilterChange}
                  placeholder="Origin or Destination"
                  className="form-control-solid"
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Fraud Status</Form.Label>
                <Form.Select
                  name="isFraud"
                  value={filters.isFraud}
                  onChange={handleFilterChange}
                  className="form-control-solid"
                >
                  <option value="">All</option>
                  <option value="true">Fraudulent</option>
                  <option value="false">Legitimate</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end">
            <Button 
              variant="outline-secondary" 
              className="me-2"
              onClick={resetFilters}
            >
              <FaSync className="me-1" /> Reset
            </Button>
            <Button 
              variant="primary"
              onClick={applyFilters}
            >
              <FaSearch className="me-1" /> Apply Filters
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white">
          <h5 className="mb-0">Transaction List</h5>
          <span className="text-muted">
            {transactions.length} transactions found
          </span>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center my-5 py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading transaction data...</p>
            </div>
          ) : transactions.length > 0 ? (
            <>
              <div className="table-responsive" ref={tableRef}>
                <Table hover className="transaction-table table-striped">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0">ID</th>
                      <th className="border-0">Type</th>
                      <th className="border-0">Amount</th>
                      <th className="border-0">From</th>
                      <th className="border-0">To</th>
                      <th className="border-0">Time</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Risk Score</th>
                      <th className="border-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody ref={tableBodyRef}>
                    <AnimatePresence>
                      {transactions.map((transaction, index) => (
                        <motion.tr 
                          key={transaction.transaction_id}
                          initial={{ opacity: 0, backgroundColor: transaction.is_fraud ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.1)' }}
                          animate={{ opacity: 1, backgroundColor: 'transparent' }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className={`transaction-row ${transaction.is_fraud ? 'fraud-row' : ''} ${
                            transaction.fraud_probability > 0.7 ? 'high-risk-row' : ''
                          } ${transaction.transaction_id === lastTransactionId ? 'new-transaction' : ''}`}
                        >
                          <td>{transaction.transaction_id.substring(0, 8)}...</td>
                          <td>
                            <Badge 
                              bg={
                                transaction.transaction_type === 'PAYMENT' ? 'info' :
                                transaction.transaction_type === 'TRANSFER' ? 'primary' :
                                transaction.transaction_type === 'CASH_OUT' ? 'warning' : 'secondary'
                              }
                              className="text-white"
                            >
                              {transaction.transaction_type}
                            </Badge>
                          </td>
                          <td className="fw-bold">${transaction.amount.toLocaleString()}</td>
                          <td>{transaction.name_orig}</td>
                          <td>{transaction.name_dest}</td>
                          <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                          <td>
                            {transaction.is_fraud ? (
                              <Badge bg="danger" pill className="fraud-badge">Fraud</Badge>
                            ) : (
                              <Badge bg="success" pill>Legitimate</Badge>
                            )}
                          </td>
                          <td>
                            <div className={`risk-score ${transaction.fraud_probability > 0.7 ? 'high-risk' : ''}`}>
                              <div 
                                className="risk-indicator" 
                                style={{ 
                                  width: `${transaction.fraud_probability * 100}%`,
                                  backgroundColor: transaction.fraud_probability > 0.7 
                                    ? 'var(--bs-danger)' 
                                    : transaction.is_fraud 
                                      ? 'var(--bs-danger)' 
                                      : 'var(--bs-success)'
                                }}
                              ></div>
                              <span>{(transaction.fraud_probability * 100).toFixed(2)}%</span>
                            </div>
                          </td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleRowClick(transaction.transaction_id)}
                            >
                              View Details
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </Table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                <div className="text-muted">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, (currentPage - 1) * pageSize + transactions.length)} of {totalPages * pageSize}+ transactions
                </div>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <Form.Label className="me-2 text-muted">Page Size:</Form.Label>
                    <Form.Select 
                      className="d-inline-block"
                      style={{ width: '80px' }}
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = parseInt(e.target.value, 10);
                        setPageSize(newSize);
                        fetchTransactions(1, newSize, getFilterParams());
                        setCurrentPage(1);
                      }}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </Form.Select>
                  </div>
                  {renderPagination()}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center my-5 py-5">
              <div className="mb-4">
                <FaSearch size={48} className="text-muted" />
              </div>
              <h4>No transactions found</h4>
              <p className="text-muted">No transactions match your current filter criteria.</p>
              <Button variant="primary" onClick={resetFilters} className="mt-2">
                Reset Filters
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default TransactionsPage;
