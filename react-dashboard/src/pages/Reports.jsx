import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col } from 'react-bootstrap';
import config from '../config';

const Reports = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        // Placeholder for actual API call
        // In a real implementation, this would fetch from a real endpoint
        const response = await fetch(`${config.backend.url}/api/reports`);
        
        // Simulate successful response for now
        // In production, you would use the actual response data
        const mockData = [
          { id: 1, title: 'Monthly Fraud Summary', date: '2023-10-01' },
          { id: 2, title: 'Transaction Volume Report', date: '2023-10-15' },
          { id: 3, title: 'Security Incidents Log', date: '2023-10-20' },
        ];
        
        setData(mockData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again later.');
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <Container className="p-4">
        <h1 className="mb-4">Reports Dashboard</h1>
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading reports data...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <h1 className="mb-4">Reports Dashboard</h1>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <div className="p-6 text-gray-500">
          🚧 This module is under construction.
        </div>
      </Container>
    );
  }

  return (
    <Container className="p-4">
      <h1 className="mb-4">Reports Dashboard</h1>
      
      <Row className="mb-4">
        <Col>
          <p className="text-muted">
            View and generate reports on transaction patterns, fraud detection, and system performance.
          </p>
        </Col>
      </Row>
      
      <Row>
        {data.map(report => (
          <Col md={4} key={report.id} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>{report.title}</Card.Title>
                <Card.Text>
                  Generated on: {report.date}
                </Card.Text>
                <button className="btn btn-primary">View Report</button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      
      {data.length === 0 && (
        <div className="p-6 text-gray-500 text-center">
          <p>No reports available at this time.</p>
          <p>🚧 This module is under construction.</p>
        </div>
      )}
    </Container>
  );
};

export default Reports;