import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const RideCards = () => {
    const [rides, setRides] = useState([]);
    const [crowdData, setCrowdData] = useState({});
    const [waitTimes, setWaitTimes] = useState({});
    const [loading, setLoading] = useState(true);

    // 1. Fetch Static Ride Data (Names and Categories)
    useEffect(() => {
        const fetchRides = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/rides`);
                if (!response.ok) throw new Error('Failed to fetch rides layout');
                const res = await response.json();
                const data = res.data; // ✅ extract array

                const actualRides = data.filter(item =>
                    item.zone === 'thrill' ||
                    item.zone === 'family' ||
                    item.zone === 'chill' ||
                    item.zone === 'kids'
                );
                setRides(actualRides);
            } catch (err) {
                console.error("Error fetching ride metadata:", err);
            }
        };
        fetchRides();
    }, []);

    // 2. Poll Live Data (Crowd & Wait Times) every 5 seconds
    useEffect(() => {
        const fetchLiveData = async () => {
            try {
                // Fetch both APIs concurrently
                const [crowdRes, waitRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/crowd`),
                    fetch(`${API_BASE_URL}/wait-times`)
                ]);

                if (crowdRes.ok) {
                    const crowdJson = await crowdRes.json();
                    const crowdDict = {};
                    crowdJson.data.forEach(item => { crowdDict[item.ride_id] = item; });
                    setCrowdData(crowdDict);
                }

                if (waitRes.ok) {
                    const waitJson = await waitRes.json();
                    const waitDict = {};
                    waitJson.data.forEach(item => { waitDict[item.ride_id] = item; });
                    setWaitTimes(waitDict);
                }

                setLoading(false);
            } catch (err) {
                console.error('Error polling live data:', err);
            }
        };

        fetchLiveData();
        const intervalId = setInterval(fetchLiveData, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // 3. Helper to style the Wait Time indicator
    const getWaitTimeStyle = (minutes) => {
        if (minutes === undefined || minutes === null) return { color: '#888' };
        if (minutes < 15) return { color: '#15803d', fontWeight: 'bold' }; // Dark Green
        if (minutes <= 45) return { color: '#b45309', fontWeight: 'bold' }; // Dark Yellow/Orange
        return { color: '#b91c1c', fontWeight: 'bold' }; // Dark Red
    };

    if (loading) return <div style={styles.loadingMsg}>Loading ride statuses...</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Live Ride Status</h2>
            <div style={styles.scrollList}>
                {rides.map(ride => {
                    const liveCrowd = crowdData[ride.ride_id];
                    const liveWait = waitTimes[ride.ride_id];

                    const waitMins = liveWait ? liveWait.actual_wait_time : 0;
                    const crowdPct = liveCrowd ? Math.round(liveCrowd.crowd_level * 100) : 0;

                    return (
                        <div key={ride.ride_id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.rideName}>{ride.name}</h3>
                                <span style={styles.categoryBadge(ride.zone)}>{ride.zone}</span>
                            </div>

                            <div style={styles.cardBody}>
                                <div style={styles.statBox}>
                                    <span style={styles.statLabel}>Wait Time</span>
                                    <span style={{ ...styles.statValue, ...getWaitTimeStyle(waitMins) }}>
                                        {waitMins} min
                                    </span>
                                </div>

                                <div style={styles.statBox}>
                                    <span style={styles.statLabel}>Capacity Full</span>
                                    <span style={styles.statValue}>
                                        {crowdPct}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Inline Styles
const styles = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        marginTop: 0,
        marginBottom: '15px',
        color: '#004080',
        fontSize: '1.25rem',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px',
    },
    loadingMsg: {
        textAlign: 'center',
        padding: '40px',
        color: '#666'
    },
    scrollList: {
        flexGrow: 1,
        overflowY: 'auto',
        paddingRight: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    card: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
    },
    rideName: {
        margin: 0,
        fontSize: '1.1rem',
        color: '#1f2937',
    },
    categoryBadge: (zone) => ({
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: 'bold',
        backgroundColor: zone === 'thrill' ? '#fee2e2' :
            zone === 'family' ? '#fef9c3' :
                zone === 'kids' ? '#e0e7ff' : '#dcfce7',
        color: zone === 'thrill' ? '#991b1b' :
            zone === 'family' ? '#854d0e' :
                zone === 'kids' ? '#3730a3' : '#166534',
    }),
    cardBody: {
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: '10px',
        borderRadius: '6px',
    },
    statBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '45%',
    },
    statLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '1.2rem',
        color: '#374151',
    }
};

export default RideCards;