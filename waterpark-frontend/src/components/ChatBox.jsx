import React, { useState, useRef, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ChatBox = ({ itinerary }) => {
  // 1. Add Minimize State (Default to closed so it doesn't block the screen initially)
  const [isMinimized, setIsMinimized] = useState(true);

  const [messages, setMessages] = useState([
    { text: "Hi! I'm your Aqua Imagicaa Assistant. Ask me about rides, wait times, or your itinerary!", sender: "bot" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when new messages arrive or when chat is opened
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isLoading, isMinimized]);

  const handleSend = async (e) => {
    e.preventDefault(); // Prevents page reload on 'Enter'
    if (!input.trim()) return;

    const userMessage = input.trim();
    
    // 1. Add user message to UI
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Call backend API
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage, 
          itinerary: itinerary 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      // 3. Add bot response to UI
      setMessages(prev => [...prev, { text: data.reply, sender: 'bot' }]);

    } catch (error) {
      setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the server right now.", sender: 'bot' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Render Minimized View
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <button 
        style={styles.minimizedButton} 
        onClick={() => setIsMinimized(false)}
      >
        Chat 🤖
      </button>
    );
  }

  // -------------------------------------------------------------
  // Render Expanded View
  // -------------------------------------------------------------
  return (
    <div style={styles.container}>
      {/* Header with Minimize Button */}
      <div style={styles.header}>
        <span>🤖 Aqua Assistant</span>
        <button 
          onClick={() => setIsMinimized(true)} 
          style={styles.minimizeButton}
          title="Minimize Chat"
        >
          &minus;
        </button>
      </div>

      {/* Messages Area */}
      <div style={styles.messagesArea}>
        {messages.map((msg, index) => (
          <div key={index} style={msg.sender === 'user' ? styles.userRow : styles.botRow}>
            <div style={msg.sender === 'user' ? styles.userBubble : styles.botBubble}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={styles.botRow}>
            <div style={styles.botBubble}>
              <em>Typing...</em>
            </div>
          </div>
        )}
        {/* Invisible div to force scroll to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          style={styles.input}
          disabled={isLoading}
        />
        <button type="submit" style={styles.sendButton} disabled={!input.trim() || isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};

const styles = {
  // New Styles for the toggle buttons
  minimizedButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 24px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 1000,
    transition: 'transform 0.2s ease',
  },
  minimizeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
    lineHeight: '1',
    padding: '0 5px',
  },
  
  // Existing Styles (Updated header layout for the button)
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '350px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
    border: '1px solid #e5e7eb'
  },
  header: {
    backgroundColor: '#004080',
    color: 'white',
    padding: '12px 15px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagesArea: {
    flex: 1,
    padding: '15px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#f9fafb',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  botRow: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '16px 16px 0px 16px',
    maxWidth: '80%',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  botBubble: {
    backgroundColor: '#e5e7eb',
    color: '#1f2937',
    padding: '10px 14px',
    borderRadius: '16px 16px 16px 0px',
    maxWidth: '80%',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  inputArea: {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    outline: 'none',
    fontSize: '0.95rem',
  },
  sendButton: {
    marginLeft: '10px',
    padding: '0 15px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }
};

export default ChatBox;