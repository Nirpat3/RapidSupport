/**
 * Support Board Chat Widget - Embeddable Script
 * Version: 1.0.0
 * 
 * Usage:
 * <script>
 *   window.SupportBoardConfig = {
 *     apiUrl: 'https://your-support-board.replit.app',
 *     contextData: {
 *       productId: 'abc123',
 *       planType: 'premium',
 *       userId: 'user456'
 *     }
 *   };
 * </script>
 * <script src="https://your-support-board.replit.app/support-widget.js"></script>
 */

(function() {
  'use strict';

  const config = window.SupportBoardConfig || {};
  const apiUrl = config.apiUrl || window.location.origin;
  const contextData = config.contextData || {};
  const customStyles = config.styles || {};

  // Generate unique session ID
  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get or create session ID
  function getSessionId() {
    let sessionId = localStorage.getItem('support-board-session');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('support-board-session', sessionId);
    }
    return sessionId;
  }

  // Create widget container
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'support-board-widget';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Create button
    const button = document.createElement('button');
    button.id = 'support-board-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    button.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${customStyles.buttonColor || '#3b82f6'};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    // Create iframe container
    const iframe = document.createElement('iframe');
    iframe.id = 'support-board-iframe';
    iframe.style.cssText = `
      display: none;
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: ${customStyles.width || '400px'};
      height: ${customStyles.height || '600px'};
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border: none;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 999998;
    `;

    // Store session data and context
    const sessionData = {
      sessionId: getSessionId(),
      contextData: contextData,
      timestamp: new Date().toISOString()
    };

    // Build iframe URL with session data
    // Use UTF-8 safe encoding for context data
    const iframeUrl = new URL('/chat', apiUrl);
    iframeUrl.searchParams.set('session', sessionData.sessionId);
    if (Object.keys(contextData).length > 0) {
      // UTF-8 safe encoding: encode to URI component then base64
      iframeUrl.searchParams.set('context', encodeURIComponent(JSON.stringify(contextData)));
    }
    
    iframe.src = iframeUrl.toString();

    // Toggle widget
    let isOpen = false;
    button.addEventListener('click', () => {
      isOpen = !isOpen;
      iframe.style.display = isOpen ? 'block' : 'none';
      
      if (isOpen) {
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    });

    // Handle messages from iframe
    window.addEventListener('message', (event) => {
      if (event.origin !== apiUrl) return;
      
      if (event.data.type === 'CLOSE_WIDGET') {
        isOpen = false;
        iframe.style.display = 'none';
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    });

    // Send context data to iframe when it's ready
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage({
        type: 'INIT_CONTEXT',
        contextData: contextData
      }, apiUrl);
    });

    container.appendChild(button);
    document.body.appendChild(container);
    document.body.appendChild(iframe);
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

  // Export API for programmatic control
  window.SupportBoard = {
    open: function() {
      document.getElementById('support-board-button')?.click();
    },
    close: function() {
      const iframe = document.getElementById('support-board-iframe');
      if (iframe && iframe.style.display !== 'none') {
        document.getElementById('support-board-button')?.click();
      }
    },
    updateContext: function(newContext) {
      const iframe = document.getElementById('support-board-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_CONTEXT',
          contextData: newContext
        }, apiUrl);
      }
    }
  };
})();
