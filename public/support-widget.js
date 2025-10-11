/**
 * Support Board Support Center Widget - Embeddable Script
 * Version: 2.0.0
 * 
 * Usage:
 * <script>
 *   window.SupportBoardConfig = {
 *     apiUrl: 'https://your-support-board.replit.app',
 *     apiKey: 'your-api-key',  // Required for full support center features
 *     customer: {
 *       name: 'John Doe',
 *       email: 'john@example.com',
 *       phone: '+1234567890',
 *       company: 'Acme Inc'
 *     },
 *     contextData: {
 *       productId: 'abc123',
 *       planType: 'premium',
 *       userId: 'user456'
 *     },
 *     styles: {
 *       buttonColor: '#3b82f6',
 *       width: '450px',
 *       height: '700px'
 *     }
 *   };
 * </script>
 * <script src="https://your-support-board.replit.app/support-widget.js"></script>
 */

(function() {
  'use strict';

  const config = window.SupportBoardConfig || {};
  const apiUrl = config.apiUrl || window.location.origin;
  const apiKey = config.apiKey || '';
  const customer = config.customer || {};
  const contextData = config.contextData || {};
  const customStyles = config.styles || {};

  let customerId = localStorage.getItem('support-board-customer-id');
  let isFullscreen = false;

  // Create or get customer via API
  async function ensureCustomer() {
    if (!apiKey) {
      console.warn('Support Board: API key required for full support center features');
      return null;
    }

    if (customerId) {
      return customerId;
    }

    if (!customer.email) {
      console.warn('Support Board: Customer email required');
      return null;
    }

    try {
      const response = await fetch(`${apiUrl}/api/widget/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          name: customer.name || 'Anonymous',
          email: customer.email,
          phone: customer.phone || '',
          company: customer.company || '',
          contextData: contextData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      const data = await response.json();
      customerId = data.data.id;
      localStorage.setItem('support-board-customer-id', customerId);
      return customerId;
    } catch (error) {
      console.error('Support Board: Failed to create customer', error);
      return null;
    }
  }

  // Create widget container
  async function createWidget() {
    // Ensure customer is created
    await ensureCustomer();

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
      width: ${customStyles.width || '450px'};
      height: ${customStyles.height || '700px'};
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border: none;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 999998;
      transition: all 0.3s ease;
    `;

    // Build iframe URL with API key and customer ID
    const iframeUrl = new URL('/support-widget', apiUrl);
    if (apiKey) {
      iframeUrl.searchParams.set('apiKey', apiKey);
    }
    if (customerId) {
      iframeUrl.searchParams.set('customerId', customerId);
    }
    if (Object.keys(contextData).length > 0) {
      iframeUrl.searchParams.set('context', encodeURIComponent(JSON.stringify(contextData)));
    }
    
    iframe.src = iframeUrl.toString();

    // Toggle widget
    let isOpen = false;
    
    function toggleWidget() {
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
    }

    button.addEventListener('click', toggleWidget);

    // Handle messages from iframe
    window.addEventListener('message', (event) => {
      if (event.origin !== apiUrl) return;
      
      if (event.data.type === 'CLOSE_WIDGET') {
        if (isOpen) {
          toggleWidget();
        }
      }

      // Handle fullscreen toggle
      if (event.data.type === 'SUPPORT_BOARD_FULLSCREEN') {
        isFullscreen = event.data.isFullscreen;
        
        if (isFullscreen) {
          // Fullscreen mode
          iframe.style.cssText = `
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            border: none;
            border-radius: 0;
            box-shadow: none;
            z-index: 999999;
            transition: all 0.3s ease;
          `;
          button.style.display = 'none';
        } else {
          // Normal mode
          iframe.style.cssText = `
            display: ${isOpen ? 'block' : 'none'};
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: ${customStyles.width || '450px'};
            height: ${customStyles.height || '700px'};
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 120px);
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 999998;
            transition: all 0.3s ease;
          `;
          button.style.display = 'flex';
        }
      }
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
      const button = document.getElementById('support-board-button');
      const iframe = document.getElementById('support-board-iframe');
      if (button && iframe && iframe.style.display === 'none') {
        button.click();
      }
    },
    close: function() {
      const button = document.getElementById('support-board-button');
      const iframe = document.getElementById('support-board-iframe');
      if (button && iframe && iframe.style.display !== 'none' && !isFullscreen) {
        button.click();
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
    },
    getCustomerId: function() {
      return customerId;
    }
  };
})();
