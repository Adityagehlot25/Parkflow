import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ParkMap = ({ itinerary }) => {
  const [layout, setLayout] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [crowdData, setCrowdData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch static park layout AND amenities on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [ridesRes, amenitiesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/rides`),
          fetch(`${API_BASE_URL}/amenities`)
        ]);
        
        if (!ridesRes.ok) throw new Error('Failed to fetch park layout');
        if (!amenitiesRes.ok) throw new Error('Failed to fetch amenities');
        
        const ridesData = await ridesRes.json();
        const amenitiesData = await amenitiesRes.json();
        
        setLayout(ridesData.data);

        // Deduplicate the time-series amenities data to get just the unique physical locations
        const uniqueAmenities = [];
        const seen = new Set();
        for (const am of amenitiesData.data) {
          if (!seen.has(am.amenity_id)) {
            seen.add(am.amenity_id);
            uniqueAmenities.push(am);
          }
        }
        setAmenities(uniqueAmenities);

      } catch (err) {
        setError(err.message);
      }
    };
    fetchStaticData();
  }, []);

  // 2. Fetch the live crowd data (Polls every 5 seconds)
  useEffect(() => {
    const fetchCrowdData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/crowd`);
        if (!response.ok) throw new Error('Failed to fetch live crowd data');
        
        const json = await response.json();
        
        const crowdDict = {};
        json.data.forEach(item => {
          crowdDict[item.ride_id] = item;
        });

        setCrowdData(crowdDict);
        setLastUpdated(json.timestamp);
        setLoading(false);
      } catch (err) {
        console.error('Crowd polling error:', err);
      }
    };

    fetchCrowdData();
    const intervalId = setInterval(fetchCrowdData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- NEW: Calculate the Remaining Plan based on current_index ---
  const remainingPlan = useMemo(() => {
    if (!itinerary || !itinerary.plan) return [];
    const currentIndex = itinerary.current_index || 0;
    return itinerary.plan.slice(currentIndex);
  }, [itinerary]);

  // 3. Create O(1) Lookup for Itinerary items based ONLY on the remaining plan
  const itineraryLookup = useMemo(() => {
    const lookup = {};
    remainingPlan.forEach(step => {
      // Rides use ride_id, Amenities use their name
      const key = step.type === 'ride' ? step.ride_id : step.name; 
      
      // Only grab the FIRST occurrence in the remaining plan
      if (lookup[key] === undefined) {
        lookup[key] = step.order;
      }
    });
    return lookup;
  }, [remainingPlan]);

  // 4. Extract points for SVG connecting lines based ONLY on the remaining plan
  const pathPoints = useMemo(() => {
    if (remainingPlan.length === 0 || layout.length === 0) return [];
    const points = [];
    
    remainingPlan.forEach(step => {
      if (step.type === 'ride') {
        const node = layout.find(n => n.ride_id === step.ride_id);
        if (node) points.push({ x: node.x_coordinate, y: node.y_coordinate });
      } else {
        if (step.location_x !== undefined && step.location_y !== undefined) {
          points.push({ x: step.location_x, y: step.location_y });
        }
      }
    });
    return points;
  }, [remainingPlan, layout]);

  const getCrowdColor = (level) => {
    if (level === undefined || level === null) return '#d3d3d3'; 
    if (level < 0.3) return '#4ade80'; 
    if (level <= 0.7) return '#facc15'; 
    return '#f87171'; 
  };

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

      <div style={styles.mapContainer}>
        {/* Draw SVG Path Connections */}
        {pathPoints.length > 1 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            {pathPoints.map((p, index) => {
              if (index === 0) return null;
              const prev = pathPoints[index - 1];
              return (
                <line 
                  key={index}
                  x1={`${prev.x}%`} 
                  y1={`${prev.y}%`} 
                  x2={`${p.x}%`} 
                  y2={`${p.y}%`} 
                  stroke="#3b82f6" 
                  strokeWidth="3" 
                  strokeDasharray="6,4" 
                />
              );
            })}
          </svg>
        )}

        {/* --- DRAW ALL RIDES --- */}
        {layout.map((node) => {
          const liveStats = crowdData[node.ride_id];
          const crowdLevel = liveStats ? liveStats.crowd_level : null;
          const queueSize = liveStats ? liveStats.people_in_queue : 0;
          
          const order = itineraryLookup[node.ride_id];
          const isInItinerary = order !== undefined;
          
          const nodeColor = isInItinerary ? '#3b82f6' : getCrowdColor(crowdLevel);

          return (
            <div
              key={node.ride_id}
              style={{
                ...styles.mapNode,
                left: `${node.x_coordinate}%`,
                top: `${node.y_coordinate}%`,
                backgroundColor: nodeColor,
                borderRadius: '50%', 
                border: isInItinerary ? '3px solid #1e3a8a' : '2px solid white',
                zIndex: isInItinerary ? 20 : 10,
              }}
              title={`${node.name} | Queue: ${queueSize}`}
            >
              <span style={styles.nodeText}>
                {isInItinerary && <span style={styles.orderBadge}>{order}</span>}
                {node.name}
              </span>
            </div>
          );
        })}

        {/* --- DRAW ALL AMENITIES --- */}
        {amenities.map((amenity) => {
          const order = itineraryLookup[amenity.name];
          const isInItinerary = order !== undefined;
          
          const isFood = amenity.type === 'food';
          const bgColor = isFood ? '#fb923c' : '#c084fc'; 

          return (
            <div
              key={amenity.amenity_id}
              style={{
                ...styles.mapNode,
                left: `${amenity.location_x}%`,
                top: `${amenity.location_y}%`,
                backgroundColor: bgColor,
                borderRadius: '8px',
                border: isInItinerary ? '3px solid #1e3a8a' : '2px solid white',
                zIndex: isInItinerary ? 25 : 5, 
                opacity: isInItinerary ? 1 : 0.85, 
              }}
              title={`${amenity.name} | Avg Wait: ${amenity.avg_wait_time} mins`}
            >
              <span style={styles.nodeText}>
                {isInItinerary && <span style={styles.orderBadge}>{order}</span>}
                {amenity.name}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div style={styles.legend}>
        <span style={{...styles.legendDot, backgroundColor: '#3b82f6'}}></span> Targeted Item
        <span style={{...styles.legendDot, backgroundColor: '#fb923c', borderRadius: '4px'}}></span> Food
        <span style={{...styles.legendDot, backgroundColor: '#c084fc', borderRadius: '4px'}}></span> Rest Area
        <span style={{...styles.legendDot, backgroundColor: '#4ade80', marginLeft: '10px'}}></span> Low Wait
        <span style={{...styles.legendDot, backgroundColor: '#facc15'}}></span> Med Wait
        <span style={{...styles.legendDot, backgroundColor: '#f87171'}}></span> High Wait
      </div>
    </div>
  );
};

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
    height: '600px', 
    backgroundColor: '#e0f2fe', 
    borderRadius: '8px',
    border: '2px solid #bae6fd',
    overflow: 'hidden',
  },
  mapNode: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    transform: 'translate(-50%, -50%)', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'background-color 0.5s ease, border 0.3s ease', 
    cursor: 'pointer',
  },
  orderBadge: {
    display: 'block',
    fontSize: '1.2rem',
    fontWeight: '900',
    color: 'white',
    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
    marginBottom: '-2px',
  },
  nodeText: {
    fontSize: '0.65rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    padding: '2px',
    lineHeight: '1.1',
    textShadow: '0px 0px 3px rgba(255,255,255,0.9)', 
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
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