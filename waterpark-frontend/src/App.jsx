import React, { useState } from 'react';
import ParkMap from './components/ParkMap';
import RideCards from './components/RideCards';
import ItineraryForm from './components/ItineraryForm'; 
import ChatBox from './components/ChatBox'; // <-- Import the new ChatBox

function App() {
  // Lifted state to share between the Form, Map, and Chat
  const [itinerary, setItinerary] = useState(null);

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={{ fontWeight: 800, fontSize: '2.7rem', color: '#002050', letterSpacing: '1px', textShadow: '0 2px 8px #b3d1ff' }}>
          🌊 Aqua Imagicaa Live Dashboard
        </h1>
        <p>Real-time crowd monitoring and ride status</p>
      </header>
      
      <main style={styles.mainContent}>
        <div style={styles.topSection}>
          {/* Left Side: 2D Park Map */}
          <div style={styles.mapSection}>
            <ParkMap itinerary={itinerary} />
          </div>

          {/* Right Side: Scrollable Ride Cards */}
          <div style={styles.sidebarSection}>
            <RideCards />
          </div>
        </div>

        {/* Bottom Section: Itinerary Planner */}
        <ItineraryForm itinerary={itinerary} setItinerary={setItinerary} />
      </main>

      {/* Floating AI Chat Assistant */}
      <ChatBox itinerary={itinerary} />
    </div>
  );
}

const styles = {
  appContainer: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#95bbdc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    position: 'relative', // Ensures the fixed chat box positions cleanly over the app
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#002050',
    background: 'linear-gradient(90deg, #e0f0ff 0%, #b3d1ff 100%)',
    borderRadius: '10px',
    padding: '18px 0 10px 0',
    boxShadow: '0 2px 8px #b3d1ff',
    width: '100%',
    maxWidth: '1200px',
  },
  mainContent: {
    width: '100%',
    maxWidth: '1200px',
    display: 'flex',
    flexDirection: 'column', 
    gap: '20px',
    alignItems: 'center',
  },
  topSection: {
    width: '100%',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  mapSection: {
    flexGrow: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  sidebarSection: {
    width: '350px',
    height: '675px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '20px',
    flexShrink: 0,
  }
};

export default App;