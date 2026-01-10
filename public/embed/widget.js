/**
 * Support Board Embed Widget
 * 
 * Usage:
 * <script src="https://your-domain.com/embed/widget.js"
 *         data-org="your-org-slug"
 *         data-position="bottom-right"
 *         data-customer-token="optional-jwt-token"
 *         data-page-url="current-page-url"
 *         data-page-title="Page Title"
 *         data-page-feature="feature-name">
 * </script>
 */
(function() {
  'use strict';
  
  // Get script configuration
  const script = document.currentScript;
  const config = {
    orgSlug: script.getAttribute('data-org') || '',
    position: script.getAttribute('data-position') || 'bottom-right',
    customerToken: script.getAttribute('data-customer-token') || '',
    pageUrl: script.getAttribute('data-page-url') || window.location.href,
    pageTitle: script.getAttribute('data-page-title') || document.title,
    pageFeature: script.getAttribute('data-page-feature') || '',
    primaryColor: script.getAttribute('data-primary-color') || '',
    locale: script.getAttribute('data-locale') || navigator.language.split('-')[0] || 'en',
    baseUrl: script.src.replace(/\/embed\/widget\.js.*$/, ''),
  };
  
  if (!config.orgSlug) {
    console.error('[SupportBoard] Missing required data-org attribute');
    return;
  }
  
  // State
  let isOpen = false;
  let sessionToken = localStorage.getItem(`sb_session_${config.orgSlug}`) || '';
  let sessionId = localStorage.getItem(`sb_sessionId_${config.orgSlug}`) || generateSessionId();
  let customerId = '';
  let conversationId = '';
  let branding = null;
  
  function generateSessionId() {
    const id = 'sb_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(`sb_sessionId_${config.orgSlug}`, id);
    return id;
  }
  
  // Styles
  const styles = `
    .sb-widget-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .sb-widget-container.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .sb-widget-container.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .sb-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--sb-primary, #2563eb);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .sb-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .sb-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .sb-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .sb-chat-window.open {
      display: flex;
    }
    .sb-chat-header {
      padding: 16px;
      background: var(--sb-primary, #2563eb);
      color: white;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sb-chat-header-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sb-chat-header-logo img {
      max-width: 32px;
      max-height: 32px;
    }
    .sb-chat-header-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .sb-chat-header-info p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .sb-chat-close {
      margin-left: auto;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
    }
    .sb-chat-iframe {
      flex: 1;
      border: none;
      width: 100%;
    }
    @media (max-width: 480px) {
      .sb-chat-window {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
    }
  `;
  
  // Create widget DOM
  function createWidget() {
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Create container
    const container = document.createElement('div');
    container.className = `sb-widget-container ${config.position}`;
    container.innerHTML = `
      <div class="sb-chat-window" id="sb-chat-window">
        <div class="sb-chat-header">
          <div class="sb-chat-header-logo" id="sb-logo">
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            </svg>
          </div>
          <div class="sb-chat-header-info">
            <h3 id="sb-org-name">Support</h3>
            <p>We typically reply within minutes</p>
          </div>
          <button class="sb-chat-close" id="sb-close">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>
        <iframe class="sb-chat-iframe" id="sb-iframe"></iframe>
      </div>
      <button class="sb-launcher" id="sb-launcher">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        </svg>
      </button>
    `;
    
    document.body.appendChild(container);
    
    // Event listeners
    document.getElementById('sb-launcher').addEventListener('click', toggleChat);
    document.getElementById('sb-close').addEventListener('click', toggleChat);
    
    // Apply primary color if set
    if (config.primaryColor) {
      container.style.setProperty('--sb-primary', config.primaryColor);
    }
    
    // Initialize session
    initSession();
  }
  
  async function initSession() {
    try {
      // If we have a customer token, exchange it first
      if (config.customerToken) {
        const exchangeRes = await fetch(`${config.baseUrl}/api/embed/exchange-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: config.customerToken,
            orgSlug: config.orgSlug,
            pageContext: {
              url: config.pageUrl,
              title: config.pageTitle,
              feature: config.pageFeature,
            }
          })
        });
        
        if (exchangeRes.ok) {
          const data = await exchangeRes.json();
          sessionToken = data.sessionToken;
          customerId = data.customerId;
          conversationId = data.conversationId;
          localStorage.setItem(`sb_session_${config.orgSlug}`, sessionToken);
        }
      }
      
      // Get org config
      const configRes = await fetch(`${config.baseUrl}/api/embed/config/${config.orgSlug}`);
      if (configRes.ok) {
        const orgConfig = await configRes.json();
        branding = orgConfig.organization;
        
        // Update UI with branding
        if (branding.name) {
          document.getElementById('sb-org-name').textContent = branding.name;
        }
        if (branding.logo) {
          document.getElementById('sb-logo').innerHTML = `<img src="${branding.logo}" alt="${branding.name}">`;
        }
        if (branding.primaryColor) {
          document.querySelector('.sb-widget-container').style.setProperty('--sb-primary', branding.primaryColor);
        }
      }
    } catch (error) {
      console.error('[SupportBoard] Failed to initialize:', error);
    }
  }
  
  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('sb-chat-window');
    const iframe = document.getElementById('sb-iframe');
    
    if (isOpen) {
      chatWindow.classList.add('open');
      
      // Build iframe URL with params
      const params = new URLSearchParams({
        org: config.orgSlug,
        embed: 'true',
        sessionId: sessionId,
      });
      
      if (config.pageUrl) params.set('pageUrl', config.pageUrl);
      if (config.pageTitle) params.set('pageTitle', config.pageTitle);
      if (config.pageFeature) params.set('pageFeature', config.pageFeature);
      if (sessionToken) params.set('sessionToken', sessionToken);
      if (customerId) params.set('customerId', customerId);
      if (conversationId) params.set('conversationId', conversationId);
      
      iframe.src = `${config.baseUrl}/customer-chat?${params.toString()}`;
    } else {
      chatWindow.classList.remove('open');
    }
  }
  
  // Public API
  window.SupportBoard = {
    open: function() {
      if (!isOpen) toggleChat();
    },
    close: function() {
      if (isOpen) toggleChat();
    },
    setCustomerToken: function(token) {
      config.customerToken = token;
      initSession();
    },
    setPageContext: function(context) {
      config.pageUrl = context.url || config.pageUrl;
      config.pageTitle = context.title || config.pageTitle;
      config.pageFeature = context.feature || config.pageFeature;
    },
    destroy: function() {
      const container = document.querySelector('.sb-widget-container');
      if (container) container.remove();
    }
  };
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
