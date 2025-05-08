// src/main.jsx
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './polyfill.js';
import App from './App';
import { SettingsProvider } from './context/SettingsContext';
import { MailboxProvider } from './context/MailboxContext';
import { ChatProvider } from './context/ChatContext';
import ChatWebSocketService from './services/ChatWebSocketService';

// Polyfill pour structuredClone
import './polyfill.js'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: '20px', padding: '10px', background: '#f7f7f7' }}>
            <summary>Show Error Details</summary>
            {this.state.error && this.state.error.toString()}
          </details>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ 
              marginTop: '20px', 
              padding: '10px 20px', 
              background: '#9333ea', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add a global error handler for WebSocket errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('WebSocket')) {
    console.error('WebSocket error caught by window error handler:', event);
  }
});

// Create a simple heartbeat function to keep WebSocket connections alive
const setupWebSocketHeartbeat = () => {
  // Check WebSocket connection every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (ChatWebSocketService.isConnected()) {
      console.log('WebSocket heartbeat: connection is active');
    } else if (ChatWebSocketService.roomId) {
      console.log('WebSocket heartbeat: connection lost, attempting to reconnect...');
      ChatWebSocketService.reconnect();
    }
  }, 30000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(heartbeatInterval);
  });
};

// Set up WebSocket heartbeat
setupWebSocketHeartbeat();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <BrowserRouter>
          <MailboxProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </MailboxProvider>
        </BrowserRouter>
      </SettingsProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
