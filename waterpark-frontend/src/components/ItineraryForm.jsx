import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ItineraryForm = ({ itinerary, setItinerary }) => {
  const [formData, setFormData] = useState({
    group_size: 4,
    age_group: 'mixed',
    thrill_preference: 0.5,
    visit_duration_hours: 4,
  });

  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age_group' ? value : Number(value),
    }));
  };

  const fetchItineraryPlan = async (dataPayload, isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/itinerary/plan-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate itinerary');
      }

      setItinerary(data);
    } catch (err) {
      if (!isBackgroundRefresh) {
        setError(err.message);
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittedData(formData);
    await fetchItineraryPlan(formData, false);
  };

  // The new handleMarkDone function calling POST /itinerary/next
  const handleMarkDone = async (e) => {
    e.preventDefault();

    // Pause the background polling so the UI doesn't reset the user's progress 
    // to step 1 the next time the interval ticks.
    setSubmittedData(null); 

    try {
      const response = await fetch(`${API_BASE_URL}/itinerary/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: itinerary.plan,
          current_index: itinerary.current_index || 0
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Merge the new progress data into the existing itinerary state
      setItinerary(prev => ({
        ...prev,
        ...data
      }));
      
    } catch (err) {
      console.error("Failed to mark as done:", err);
    }
  };

  useEffect(() => {
    if (!submittedData) return;

    const intervalId = setInterval(() => {
      fetchItineraryPlan(submittedData, true);
    }, 10000); 

    return () => clearInterval(intervalId);
  }, [submittedData]);

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Plan Your Visit</h2>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Group Size:</label>
          <input
            type="number"
            name="group_size"
            value={formData.group_size}
            onChange={handleChange}
            min="1"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Age Group:</label>
          <select
            name="age_group"
            value={formData.age_group}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="kids">Kids</option>
            <option value="mixed">Mixed</option>
            <option value="adults">Adults</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Thrill Preference ({formData.thrill_preference}):
          </label>
          <input
            type="range"
            name="thrill_preference"
            min="0"
            max="1"
            step="0.1"
            value={formData.thrill_preference}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Visit Duration (Hours):</label>
          <input
            type="number"
            name="visit_duration_hours"
            value={formData.visit_duration_hours}
            onChange={handleChange}
            min="1"
            max="12"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Generating Plan...' : 'Generate Itinerary'}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {itinerary && itinerary.plan && (
        <div style={styles.results}>
          <div style={styles.resultsHeaderContainer}>
            <h3 style={styles.resultsHeader}>
              Your Itinerary ({itinerary.remaining_time ?? itinerary.total_time} mins remaining)
            </h3>
            {submittedData && (
              <span style={styles.liveIndicator}>
                <span style={styles.liveDot}></span> Live Updating
              </span>
            )}
          </div>

          <ul style={styles.list}>
            {itinerary.plan.map((item, index) => {
              const isCompleted = index < (itinerary.current_index || 0);
              const isActive = index === (itinerary.current_index || 0);

              return (
                <li
                  key={index}
                  style={{
                    ...styles.listItem,
                    backgroundColor: item.type === 'ride' ? '#f0fdf4' : '#fffbeb',
                    borderColor: item.type === 'ride' ? '#bbf7d0' : '#fef08a',
                    // Visually mark completed items by fading them and crossing out text
                    opacity: isCompleted ? 0.5 : 1,
                    textDecoration: isCompleted ? 'line-through' : 'none'
                  }}
                >
                  <div style={styles.itemHeader}>
                    <strong>{item.order}. {item.name}</strong>
                    <span style={styles.badge(item.type)}>{item.type}</span>
                  </div>
                  <div style={styles.itemDetail}>
                    Expected Wait: {item.expected_wait.toFixed(1)} mins
                  </div>
                  
                  {/* Only show the 'Done' button on the immediately active step */}
                  {isActive && (
                    <button onClick={handleMarkDone} style={styles.doneButton}>
                      Done ✅
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '20px',
    marginTop: '20px',
    width: '100%',
    maxWidth: '1200px',
    boxSizing: 'border-box',
  },
  header: {
    marginTop: 0,
    color: '#004080',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '10px',
    marginBottom: '15px',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'flex-end',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 200px',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '0.9rem',
    color: '#374151',
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1rem',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    flex: '1 1 100%',
  },
  doneButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    alignSelf: 'flex-start',
    transition: 'background-color 0.2s',
  },
  error: {
    color: 'red',
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
  },
  results: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #e5e7eb',
  },
  resultsHeaderContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  resultsHeader: {
    margin: 0,
    color: '#1f2937',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#16a34a',
    fontWeight: 'bold',
    backgroundColor: '#dcfce7',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#16a34a',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listItem: {
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    transition: 'all 0.3s ease', 
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1.1rem',
  },
  badge: (type) => ({
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
    backgroundColor: type === 'ride' ? '#bbf7d0' : '#fef08a',
    color: type === 'ride' ? '#166534' : '#854d0e',
  }),
  itemDetail: {
    fontSize: '0.9rem',
    color: '#4b5563',
  },
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
`;
document.head.appendChild(styleSheet);

export default ItineraryForm;