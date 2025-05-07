// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { MailboxProvider } from './context/MailboxContext'
import { ChatProvider } from './context/ChatContext.jsx'

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

ReactDOM.createRoot(document.getElementById('root')).render(
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
  </React.StrictMode>,
)
