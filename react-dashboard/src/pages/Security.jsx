import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import config from '../config';

const Security = () => {
  const [securityData, setSecurityData] = useState({
    status: 'Unknown',
    threats_detected: 0,
    firewall: 'Unknown',
    last_scan: '',
    encryption: 'Unknown',
    compliance: 'Unknown',
    recentIncidents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(config.backend.securityStatusUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();

        // Map API response to our component state
        const mappedData = {
          threatLevel: data.status === 'Secure' ? 'Low' : 'High',
          lastScan: data.last_scan ? new Date(data.last_scan).toLocaleDateString() : 'Unknown',
          activeThreats: data.threats_detected || 0,
          firewall: data.firewall || 'Unknown',
          encryption: data.encryption || 'Unknown',
          compliance: data.compliance || 'Unknown',
          recentIncidents: [
            // Keep some sample incidents for now
            { id: 1, type: 'Suspicious Login', date: '2023-10-20', status: 'Resolved' },
            { id: 2, type: 'Unusual Transaction Pattern', date: '2023-10-18', status: 'Investigating' },
            { id: 3, type: 'API Access Attempt', date: '2023-10-15', status: 'Blocked' }
          ]
        };

        setSecurityData(mappedData);
        setError(null);
      } else {
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching security data:', err);
      setError('Failed to load security information. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(fetchSecurityData, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <Container className="p-4">
        <h1 className="mb-4">Security Dashboard</h1>
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading security data...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <h1 className="mb-4">Security Dashboard</h1>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <div className="p-6 text-gray-500">
          🚧 This module is under construction.
        </div>
      </Container>
    );
  }

  const getThreatLevelClass = (level) => {
    switch(level.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  return (
    <Container className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <h1 className="mb-0 me-3">Security Dashboard</h1>
          <div className="d-flex align-items-center">
            <span className={`badge bg-${securityData.threatLevel === 'Low' ? 'success' : 'danger'} me-3`}>
              {securityData.threatLevel === 'Low' ? 'Secure' : 'Threat Detected'}
            </span>
            {refreshing && (
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Refreshing...</span>
              </Spinner>
            )}
          </div>
        </div>
        <button 
          className="btn btn-outline-primary" 
          onClick={fetchSecurityData} 
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      <Row className="mb-4">
        <Col>
          <p className="text-muted">
            Monitor system security, view threats, and manage security settings.
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Current Threat Level</Card.Title>
              <Alert variant={getThreatLevelClass(securityData.threatLevel)} className="mt-3">
                {securityData.threatLevel}
              </Alert>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Last Security Scan</Card.Title>
              <Card.Text className="mt-3">
                {securityData.lastScan}
              </Card.Text>
              <button className="btn btn-primary">Run New Scan</button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Active Threats</Card.Title>
              <h3 className="mt-3">{securityData.activeThreats}</h3>
              {securityData.activeThreats > 0 && (
                <button className="btn btn-danger">View Threats</button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Firewall Status</Card.Title>
              <Alert 
                variant={securityData.firewall === 'Active' ? 'success' : 'warning'} 
                className="mt-3"
              >
                {securityData.firewall}
              </Alert>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Encryption</Card.Title>
              <Alert 
                variant={securityData.encryption === 'Enabled' ? 'success' : 'warning'} 
                className="mt-3"
              >
                {securityData.encryption}
              </Alert>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Compliance Status</Card.Title>
              <Alert 
                variant={securityData.compliance === 'Compliant' ? 'success' : 'warning'} 
                className="mt-3"
              >
                {securityData.compliance}
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Header>Recent Security Incidents</Card.Header>
            <Card.Body>
              {securityData.recentIncidents.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityData.recentIncidents.map(incident => (
                      <tr key={incident.id}>
                        <td>{incident.type}</td>
                        <td>{incident.date}</td>
                        <td>
                          <span className={`badge bg-${
                            incident.status === 'Resolved' ? 'success' : 
                            incident.status === 'Investigating' ? 'warning' : 'danger'
                          }`}>
                            {incident.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center">No recent security incidents.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {securityData.recentIncidents.length === 0 && (
        <div className="p-6 text-gray-500 text-center mt-4">
          <p>🚧 This module is under construction.</p>
        </div>
      )}
    </Container>
  );
};

export default Security;
