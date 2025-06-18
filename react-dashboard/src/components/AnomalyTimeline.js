import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaRedo, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './AnomalyTimeline.css';

// Mock data generator for anomaly timeline
const generateMockTimelineData = () => {
  // Generate data for the last 30 days
  const dates = [];
  const transactionCounts = [];
  const fraudCounts = [];
  const anomalyScores = [];
  
  const today = new Date();
  
  // Create some anomaly spikes
  const anomalyDays = [5, 12, 18, 25]; // Days with anomalies
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
    
    // Base transaction count (100-300)
    let baseCount = Math.floor(Math.random() * 200) + 100;
    
    // Add anomaly spikes on specific days
    const isAnomalyDay = anomalyDays.includes(i);
    if (isAnomalyDay) {
      baseCount += Math.floor(Math.random() * 300) + 200; // Add 200-500 transactions
    }
    
    transactionCounts.push(baseCount);
    
    // Fraud count (3-8% of transactions, higher on anomaly days)
    const fraudRate = isAnomalyDay ? 0.15 + (Math.random() * 0.1) : 0.03 + (Math.random() * 0.05);
    const fraudCount = Math.floor(baseCount * fraudRate);
    fraudCounts.push(fraudCount);
    
    // Anomaly score (0-1, higher on anomaly days)
    const anomalyScore = isAnomalyDay ? 0.7 + (Math.random() * 0.3) : Math.random() * 0.3;
    anomalyScores.push(anomalyScore);
  }
  
  return {
    dates,
    transactionCounts,
    fraudCounts,
    anomalyScores,
    anomalyDays: anomalyDays.map(day => dates[29 - day]) // Convert to actual dates
  };
};

// Generate detailed data for a specific day
const generateDayDetails = (date, isAnomalyDay) => {
  const hours = [];
  const hourlyTransactions = [];
  const hourlyFraud = [];
  
  // Generate hourly data
  for (let i = 0; i < 24; i++) {
    hours.push(`${i}:00`);
    
    // More transactions during business hours, with anomaly spikes
    let hourlyCount;
    if (i >= 8 && i <= 18) {
      // Business hours
      hourlyCount = Math.floor(Math.random() * 30) + 20;
      
      // Add anomaly spike at a random business hour if it's an anomaly day
      if (isAnomalyDay && (i === 10 || i === 14 || i === 16)) {
        hourlyCount += Math.floor(Math.random() * 50) + 30;
      }
    } else {
      // Non-business hours
      hourlyCount = Math.floor(Math.random() * 10) + 5;
    }
    
    hourlyTransactions.push(hourlyCount);
    
    // Fraud count (higher percentage during anomaly spikes)
    const fraudRate = isAnomalyDay && (i === 10 || i === 14 || i === 16) 
      ? 0.2 + (Math.random() * 0.15) 
      : 0.03 + (Math.random() * 0.05);
    
    hourlyFraud.push(Math.floor(hourlyCount * fraudRate));
  }
  
  return {
    hours,
    hourlyTransactions,
    hourlyFraud
  };
};

const AnomalyTimeline = () => {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('30d'); // '24h', '7d', '30d', 'custom'
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const [currentPosition, setCurrentPosition] = useState(0); // Index in the timeline
  const [detailData, setDetailData] = useState(null);
  
  const playbackInterval = useRef(null);
  
  // Load initial data
  useEffect(() => {
    setLoading(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const mockData = generateMockTimelineData();
      setTimelineData(mockData);
      setLoading(false);
      
      // Set initial detail data to the first day
      updateDetailView(0);
    }, 1000);
    
    // Cleanup
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, []);
  
  // Update detail view when position changes
  const updateDetailView = (position) => {
    if (!timelineData) return;
    
    const date = timelineData.dates[position];
    const isAnomalyDay = timelineData.anomalyDays.includes(date);
    
    const details = generateDayDetails(date, isAnomalyDay);
    setDetailData({
      ...details,
      date,
      isAnomalyDay,
      totalTransactions: timelineData.transactionCounts[position],
      totalFraud: timelineData.fraudCounts[position],
      anomalyScore: timelineData.anomalyScores[position]
    });
  };
  
  // Handle playback controls
  const togglePlayback = () => {
    if (playbackActive) {
      // Stop playback
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
      setPlaybackActive(false);
    } else {
      // Start playback
      playbackInterval.current = setInterval(() => {
        setCurrentPosition(prev => {
          const newPosition = prev + 1;
          if (newPosition >= timelineData.dates.length) {
            // End of timeline, stop playback
            clearInterval(playbackInterval.current);
            playbackInterval.current = null;
            setPlaybackActive(false);
            return prev;
          }
          
          // Update detail view
          updateDetailView(newPosition);
          return newPosition;
        });
      }, 1000 / playbackSpeed);
      
      setPlaybackActive(true);
    }
  };
  
  // Handle step forward
  const stepForward = () => {
    if (currentPosition < timelineData.dates.length - 1) {
      const newPosition = currentPosition + 1;
      setCurrentPosition(newPosition);
      updateDetailView(newPosition);
    }
  };
  
  // Handle step backward
  const stepBackward = () => {
    if (currentPosition > 0) {
      const newPosition = currentPosition - 1;
      setCurrentPosition(newPosition);
      updateDetailView(newPosition);
    }
  };
  
  // Handle reset
  const resetPlayback = () => {
    setCurrentPosition(0);
    updateDetailView(0);
    
    // Stop playback if active
    if (playbackActive) {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
      setPlaybackActive(false);
    }
  };
  
  // Handle speed change
  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    
    // Update interval if playback is active
    if (playbackActive && playbackInterval.current) {
      clearInterval(playbackInterval.current);
      
      playbackInterval.current = setInterval(() => {
        setCurrentPosition(prev => {
          const newPosition = prev + 1;
          if (newPosition >= timelineData.dates.length) {
            // End of timeline, stop playback
            clearInterval(playbackInterval.current);
            playbackInterval.current = null;
            setPlaybackActive(false);
            return prev;
          }
          
          // Update detail view
          updateDetailView(newPosition);
          return newPosition;
        });
      }, 1000 / speed);
    }
  };
  
  // Handle range change
  const handleRangeChange = (e) => {
    setSelectedRange(e.target.value);
    // In a real app, this would trigger a new data fetch
  };
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const position = parseInt(e.target.value, 10);
    setCurrentPosition(position);
    updateDetailView(position);
  };
  
  // Prepare chart data for the timeline
  const timelineChartData = timelineData ? {
    labels: timelineData.dates,
    datasets: [
      {
        label: 'Transactions',
        data: timelineData.transactionCounts,
        borderColor: 'rgba(53, 162, 235, 1)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Fraud',
        data: timelineData.fraudCounts,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Anomaly Score',
        data: timelineData.anomalyScores,
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        yAxisID: 'y1',
        borderDash: [5, 5],
      }
    ]
  } : null;
  
  // Prepare chart data for the detail view
  const detailChartData = detailData ? {
    labels: detailData.hours,
    datasets: [
      {
        label: 'Hourly Transactions',
        data: detailData.hourlyTransactions,
        borderColor: 'rgba(53, 162, 235, 1)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Hourly Fraud',
        data: detailData.hourlyFraud,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      }
    ]
  } : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mb-4 anomaly-timeline-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaClock className="me-2 text-primary" />
            <h5 className="mb-0">Anomaly Timeline</h5>
          </div>
          <div>
            <Form.Select 
              value={selectedRange}
              onChange={handleRangeChange}
              className="d-inline-block me-2"
              style={{ width: '120px' }}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </Form.Select>
          </div>
        </Card.Header>
        
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading timeline data...</p>
            </div>
          ) : (
            <>
              {/* Timeline Chart */}
              <div className="timeline-chart-container mb-4">
                <Line 
                  data={timelineChartData}
                  options={{
                    responsive: true,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Transaction Count'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 1,
                        title: {
                          display: true,
                          text: 'Anomaly Score'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    }
                  }}
                />
                
                {/* Current position marker */}
                <div 
                  className="position-marker" 
                  style={{ 
                    left: `${(currentPosition / (timelineData.dates.length - 1)) * 100}%` 
                  }}
                />
              </div>
              
              {/* Playback controls */}
              <div className="playback-controls mb-4">
                <Row className="align-items-center">
                  <Col md={8}>
                    <Form.Range
                      min={0}
                      max={timelineData.dates.length - 1}
                      value={currentPosition}
                      onChange={handleSliderChange}
                      className="timeline-slider"
                    />
                  </Col>
                  <Col md={4}>
                    <div className="d-flex justify-content-end">
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={resetPlayback}
                        className="me-2"
                      >
                        <FaRedo />
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={stepBackward}
                        disabled={currentPosition === 0}
                        className="me-2"
                      >
                        <FaStepBackward />
                      </Button>
                      <Button 
                        variant={playbackActive ? "outline-danger" : "outline-success"}
                        size="sm"
                        onClick={togglePlayback}
                        className="me-2"
                      >
                        {playbackActive ? <FaPause /> : <FaPlay />}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={stepForward}
                        disabled={currentPosition === timelineData.dates.length - 1}
                        className="me-2"
                      >
                        <FaStepForward />
                      </Button>
                      <div className="speed-controls">
                        {[1, 2, 4].map(speed => (
                          <Button
                            key={speed}
                            variant={playbackSpeed === speed ? "primary" : "outline-primary"}
                            size="sm"
                            onClick={() => changeSpeed(speed)}
                            className="speed-button"
                          >
                            {speed}x
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Col>
                </Row>
                <div className="current-date mt-2 text-center">
                  <strong>Current Date:</strong> {timelineData.dates[currentPosition]}
                  {timelineData.anomalyDays.includes(timelineData.dates[currentPosition]) && (
                    <Badge bg="danger" className="ms-2">Anomaly Detected</Badge>
                  )}
                </div>
              </div>
              
              {/* Detail view */}
              {detailData && (
                <div className="detail-view">
                  <h6 className="detail-date">
                    {new Date(detailData.date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {detailData.isAnomalyDay && (
                      <Badge bg="danger" className="ms-2">Anomaly Day</Badge>
                    )}
                  </h6>
                  
                  <Row className="mb-3">
                    <Col md={3}>
                      <div className="detail-stat">
                        <div className="stat-value">{detailData.totalTransactions}</div>
                        <div className="stat-label">Total Transactions</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="detail-stat">
                        <div className="stat-value">{detailData.totalFraud}</div>
                        <div className="stat-label">Fraudulent Transactions</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="detail-stat">
                        <div className="stat-value">
                          {((detailData.totalFraud / detailData.totalTransactions) * 100).toFixed(2)}%
                        </div>
                        <div className="stat-label">Fraud Rate</div>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="detail-stat">
                        <div className="stat-value">{(detailData.anomalyScore * 100).toFixed(2)}%</div>
                        <div className="stat-label">Anomaly Score</div>
                      </div>
                    </Col>
                  </Row>
                  
                  <div className="detail-chart">
                    <Line 
                      data={detailChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          title: {
                            display: true,
                            text: 'Hourly Transaction Activity'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Count'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </motion.div>
  );
};

export default AnomalyTimeline;