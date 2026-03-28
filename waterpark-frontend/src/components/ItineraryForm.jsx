import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ItineraryForm = ({ itinerary, setItinerary }) => {
  const [formData, setFormData] = useState({
    group_size: 4,
    age_group: 'mixed',
    thrill_preference: 0.5,
    visit_duration_hours: 4,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age_group' ? value : Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/itinerary/plan-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate itinerary');
      }

      setItinerary(data); // Set the lifted state
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <h3 style={styles.resultsHeader}>
            Your Itinerary ({itinerary.total_time} mins)
          </h3>
          <ul style={styles.list}>
            {itinerary.plan.map((item, index) => (
              <li
                key={index}
                style={{
                  ...styles.listItem,
                  backgroundColor: item.type === 'ride' ? '#f0fdf4' : '#fffbeb',
                  borderColor: item.type === 'ride' ? '#bbf7d0' : '#fef08a',
                }}
              >
                <div style={styles.itemHeader}>
                  <strong>{item.order}. {item.name}</strong>
                  <span style={styles.badge(item.type)}>{item.type}</span>
                </div>
                <div style={styles.itemDetail}>
                  Expected Wait: {item.expected_wait.toFixed(1)} mins
                </div>
              </li>
            ))}
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
  resultsHeader: {
    marginTop: 0,
    color: '#1f2937',
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

export default ItineraryForm;