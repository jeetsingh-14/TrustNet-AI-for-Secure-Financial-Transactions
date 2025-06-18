import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MarkerClusterGroup } from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { FaMapMarkedAlt, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './FraudHeatmap.css';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Mock data for fraud locations
const generateMockFraudData = (count = 100) => {
  const fraudTypes = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT'];
  const riskLevels = ['low', 'medium', 'high'];
  
  return Array.from({ length: count }, (_, i) => {
    const isFraud = Math.random() > 0.7; // 30% chance of fraud
    const riskLevel = isFraud 
      ? (Math.random() > 0.5 ? 'high' : 'medium')
      : (Math.random() > 0.7 ? 'medium' : 'low');
    
    // Generate random dates within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: `fraud-${i}`,
      lat: 40 - (Math.random() * 10), // Random latitude around North America
      lng: -100 + (Math.random() * 50), // Random longitude around North America
      amount: Math.floor(Math.random() * 10000) + 100,
      fraudProbability: isFraud ? 0.7 + (Math.random() * 0.3) : Math.random() * 0.3,
      isFraud,
      riskLevel,
      transactionType: fraudTypes[Math.floor(Math.random() * fraudTypes.length)],
      timestamp: date.toISOString(),
      location: `Location ${i + 1}`
    };
  });
};

// HeatmapLayer component
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!points.length) return;
    
    // Convert points to format expected by Leaflet.heat
    const heatPoints = points.map(p => [
      p.lat, 
      p.lng, 
      p.fraudProbability // Weight by fraud probability
    ]);
    
    // Create and add heat layer
    const heat = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.4: 'blue', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
    }).addTo(map);
    
    // Cleanup
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  
  return null;
};

const FraudHeatmap = () => {
  const [fraudData, setFraudData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'markers'
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
    fraudType: 'all',
    riskLevel: 'all'
  });
  
  const mapRef = useRef(null);
  
  // Load fraud data
  useEffect(() => {
    setLoading(true);
    
    // In a real app, this would be an API call with filters
    // For now, we'll use mock data
    setTimeout(() => {
      const mockData = generateMockFraudData(200);
      setFraudData(mockData);
      setLoading(false);
    }, 1000);
  }, []);
  
  // Filter data based on user selections
  const filteredData = fraudData.filter(item => {
    const itemDate = new Date(item.timestamp);
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59); // Include the entire end day
    
    const dateInRange = itemDate >= startDate && itemDate <= endDate;
    const typeMatches = filters.fraudType === 'all' || item.transactionType === filters.fraudType;
    const riskMatches = filters.riskLevel === 'all' || item.riskLevel === filters.riskLevel;
    
    return dateInRange && typeMatches && riskMatches;
  });
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Apply filters
  const applyFilters = () => {
    // In a real app, this might trigger a new API call
    // For our mock data, the filtering happens in the filteredData variable
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mb-4 fraud-heatmap-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaMapMarkedAlt className="me-2 text-primary" />
            <h5 className="mb-0">Fraud Risk Heatmap</h5>
          </div>
          <div>
            <Form.Check
              type="switch"
              id="view-mode-switch"
              label={viewMode === 'heatmap' ? 'Heatmap View' : 'Marker View'}
              checked={viewMode === 'heatmap'}
              onChange={() => setViewMode(viewMode === 'heatmap' ? 'markers' : 'heatmap')}
              className="d-inline-block me-3"
            />
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* Filters */}
          <div className="mb-4 p-3 bg-light rounded">
            <Row className="align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label><FaCalendarAlt className="me-1" /> Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label><FaCalendarAlt className="me-1" /> End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label><FaFilter className="me-1" /> Transaction Type</Form.Label>
                  <Form.Select
                    name="fraudType"
                    value={filters.fraudType}
                    onChange={handleFilterChange}
                  >
                    <option value="all">All Types</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="CASH_OUT">Cash Out</option>
                    <option value="DEBIT">Debit</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label><FaFilter className="me-1" /> Risk Level</Form.Label>
                  <Form.Select
                    name="riskLevel"
                    value={filters.riskLevel}
                    onChange={handleFilterChange}
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button 
                  variant="primary" 
                  className="w-100"
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
              </Col>
            </Row>
          </div>
          
          {/* Map */}
          <div className="fraud-map-container">
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading fraud data...</p>
              </div>
            ) : (
              <MapContainer 
                center={[39.8283, -98.5795]} // Center of the US
                zoom={4} 
                style={{ height: '500px', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {viewMode === 'heatmap' ? (
                  <HeatmapLayer points={filteredData} />
                ) : (
                  <MarkerClusterGroup>
                    {filteredData.map(point => (
                      <Marker 
                        key={point.id} 
                        position={[point.lat, point.lng]}
                        icon={L.divIcon({
                          className: `custom-marker ${point.riskLevel}-risk`,
                          html: `<div></div>`,
                          iconSize: [20, 20]
                        })}
                      >
                        <Popup>
                          <div>
                            <h6>{point.location}</h6>
                            <p>
                              <strong>Type:</strong> {point.transactionType}<br />
                              <strong>Amount:</strong> ${point.amount.toLocaleString()}<br />
                              <strong>Risk Level:</strong> {point.riskLevel.charAt(0).toUpperCase() + point.riskLevel.slice(1)}<br />
                              <strong>Fraud Probability:</strong> {(point.fraudProbability * 100).toFixed(2)}%<br />
                              <strong>Date:</strong> {new Date(point.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                )}
              </MapContainer>
            )}
          </div>
          
          {/* Stats */}
          <div className="mt-3 d-flex justify-content-between">
            <div className="fraud-map-stat">
              <span className="stat-value">{filteredData.length}</span>
              <span className="stat-label">Transactions</span>
            </div>
            <div className="fraud-map-stat">
              <span className="stat-value">{filteredData.filter(d => d.isFraud).length}</span>
              <span className="stat-label">Fraud Cases</span>
            </div>
            <div className="fraud-map-stat">
              <span className="stat-value">
                {filteredData.length > 0 
                  ? ((filteredData.filter(d => d.isFraud).length / filteredData.length) * 100).toFixed(2)
                  : 0}%
              </span>
              <span className="stat-label">Fraud Rate</span>
            </div>
            <div className="fraud-map-stat">
              <span className="stat-value">
                ${filteredData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </span>
              <span className="stat-label">Total Amount</span>
            </div>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  );
};

export default FraudHeatmap;