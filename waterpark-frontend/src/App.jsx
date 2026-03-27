import React from 'react';
import ParkMap from './components/ParkMap';
import RideCards from './components/RideCards';

function App() {
  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={{ fontWeight: 800, fontSize: '2.7rem', color: '#002050', letterSpacing: '1px', textShadow: '0 2px 8px #b3d1ff' }}>
          🌊 Aqua Imagicaa Live Dashboard
        </h1>
        <p>Real-time crowd monitoring and ride status</p>
      </header>
      
      <main style={styles.mainContent}>
        {/* Left Side: 2D Park Map */}
        <div style={styles.mapSection}>
          <ParkMap />
        </div>

        {/* Right Side: Scrollable Ride Cards */}
        <div style={styles.sidebarSection}>
          <RideCards />
        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f0f8ff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#002050',
    background: 'linear-gradient(90deg, #e0f0ff 0%, #b3d1ff 100%)',
    borderRadius: '10px',
    padding: '18px 0 10px 0',
    boxShadow: '0 2px 8px #b3d1ff',
  },
  mainContent: {
    width: '100%',
    maxWidth: '1200px', // Widened to accommodate sidebar
    display: 'flex',
    gap: '20px',       // Space between map and sidebar
    alignItems: 'flex-start',
  },
  mapSection: {
    flexGrow: 1, // Map takes up remaining space
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  sidebarSection: {
    width: '350px', // Fixed width for the cards
    height: '675px', // Matches roughly the height of the Map + Header
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '20px',
    flexShrink: 0,
  }
};

export default App;