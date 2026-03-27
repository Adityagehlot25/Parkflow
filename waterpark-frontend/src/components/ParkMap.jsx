import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ParkMap = () => {
  const [layout, setLayout] = useState([]);
  const [crowdData, setCrowdData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch the static park layout (Only runs once on mount)
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/rides`);
        if (!response.ok) throw new Error('Failed to fetch park layout');
        const data = await response.json();
        setLayout(data.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLayout();
  }, []);

  // 2. Fetch the live crowd data (Polls every 5 seconds)
  useEffect(() => {
    const fetchCrowdData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/crowd`);
        if (!response.ok) throw new Error('Failed to fetch live crowd data');
        
        const json = await response.json();
        
        // Convert the array of crowd objects into a dictionary for O(1) lookups
        const crowdDict = {};
        json.data.forEach(item => {
          crowdDict[item.ride_id] = item;
        });

        setCrowdData(crowdDict);
        setLastUpdated(json.timestamp);
        setLoading(false);
      } catch (err) {
        console.error('Crowd polling error:', err);
        // We don't set error state here to prevent the map from unmounting 
        // if a single poll fails intermittently.
      }
    };

    // Initial fetch
    fetchCrowdData();

    // Set up polling interval
    const intervalId = setInterval(fetchCrowdData, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // 3. Helper to determine color based on crowd level
  const getCrowdColor = (level) => {
    if (level === undefined || level === null) return '#d3d3d3'; // Gray if no data
    if (level < 0.3) return '#4ade80'; // Green (Low)
    if (level <= 0.7) return '#facc15'; // Yellow (Medium)
    return '#f87171'; // Red (High)
  };

  // Render States
  if (error) return <div style={styles.errorMsg}>Error: {error}</div>;
  if (loading) return <div style={styles.loadingMsg}>Loading Park Map...</div>;

  return (
    <div>
      <div style={styles.statusBar}>
        <strong>Live Park Map</strong>
        {lastUpdated && (
          <span style={styles.timestamp}>
            Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* The 2D Coordinate Grid */}
      <div style={styles.mapContainer}>
        {layout.map((node) => {
          // Merge static layout with dynamic crowd data
          const liveStats = crowdData[node.ride_id];
          const crowdLevel = liveStats ? liveStats.crowd_level : null;
          const queueSize = liveStats ? liveStats.people_in_queue : 0;
          
          const nodeColor = getCrowdColor(crowdLevel);
          const isAmenity = node.zone === 'food' || node.zone === 'rest';

          return (
            <div
              key={node.ride_id}
              style={{
                ...styles.mapNode,
                left: `${node.x_coordinate}%`,
                top: `${node.y_coordinate}%`,
                backgroundColor: nodeColor,
                // Make amenities slightly smaller/different shape if desired
                borderRadius: isAmenity ? '4px' : '50%', 
                border: isAmenity ? '2px dashed #666' : '2px solid white',
              }}
              title={`${node.name} | Queue: ${queueSize}`} // Native browser tooltip
            >
              <span style={styles.nodeText}>{node.name}</span>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div style={styles.legend}>
        <span style={{...styles.legendDot, backgroundColor: '#4ade80'}}></span> Low
        <span style={{...styles.legendDot, backgroundColor: '#facc15'}}></span> Medium
        <span style={{...styles.legendDot, backgroundColor: '#f87171'}}></span> High
        <span style={{...styles.legendDot, backgroundColor: '#d3d3d3', borderRadius: '4px'}}></span> Amenity
      </div>
    </div>
  );
};

// Inline Styles
const styles = {
  errorMsg: { color: 'red', textAlign: 'center', padding: '20px' },
  loadingMsg: { textAlign: 'center', padding: '40px', color: '#666' },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  timestamp: {
    fontSize: '0.85rem',
    color: '#888',
  },
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: '600px', // Fixed height as requested
    backgroundColor: '#e0f2fe', // Light water blue background
    borderRadius: '8px',
    border: '2px solid #bae6fd',
    overflow: 'hidden',
  },
  mapNode: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    transform: 'translate(-50%, -50%)', // Centers the dot exactly on the coordinate
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'background-color 0.5s ease', // Smooth color transitions during updates
    cursor: 'pointer',
    zIndex: 10,
  },
  nodeText: {
    fontSize: '0.65rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    padding: '2px',
    textShadow: '0px 0px 2px rgba(255,255,255,0.8)', // Makes text readable regardless of circle color
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '15px',
    fontSize: '0.85rem',
  },
  legendDot: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: '4px',
  }
};

export default ParkMap;