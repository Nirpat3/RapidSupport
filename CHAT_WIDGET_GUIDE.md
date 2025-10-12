# Chat Widget Embedding & Customization Guide

## Overview
Support Board includes an embeddable chat widget that can be added to any website or application. The widget provides AI-powered support, conversation threading, file attachments, and seamless integration with your support dashboard.

---

## 🚀 Quick Start: Embed the Widget

### Method 1: Basic Iframe Embed

```html
<!-- Add this to your website -->
<iframe 
  src="https://your-domain.replit.app/chat"
  width="400"
  height="600"
  frameborder="0"
  allow="camera; microphone"
  style="position: fixed; bottom: 20px; right: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
></iframe>
```

### Method 2: Floating Button Widget

```html
<!-- Add this to your website's <body> -->
<script>
(function() {
  // Create floating chat button
  const chatButton = document.createElement('div');
  chatButton.id = 'support-chat-button';
  chatButton.innerHTML = `
    <style>
      #support-chat-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: #3b82f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        z-index: 9998;
        transition: transform 0.2s;
      }
      #support-chat-button:hover {
        transform: scale(1.1);
      }
      #support-chat-button svg {
        width: 30px;
        height: 30px;
        fill: white;
      }
      #support-chat-widget {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 400px;
        height: 600px;
        border: none;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 9999;
        display: none;
      }
      #support-chat-widget.open {
        display: block;
      }
    </style>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  `;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'support-chat-widget';
  iframe.src = 'https://your-domain.replit.app/chat';
  iframe.allow = 'camera; microphone';
  
  // Toggle widget
  chatButton.addEventListener('click', function() {
    iframe.classList.toggle('open');
  });
  
  document.body.appendChild(chatButton);
  document.body.appendChild(iframe);
})();
</script>
```

---

## 🎨 Customization Options

### 1. URL Parameters

Pass customization via URL parameters:

```html
<iframe src="https://your-domain.replit.app/chat?
  primaryColor=%233b82f6
  &position=bottom-left
  &greeting=Hi!%20How%20can%20we%20help?
  &name=John%20Doe
  &email=john@example.com
"></iframe>
```

**Available Parameters:**
- `primaryColor` - Widget accent color (hex without #)
- `position` - Widget position (`bottom-right`, `bottom-left`, `top-right`, `top-left`)
- `greeting` - Custom greeting message
- `name` - Pre-fill customer name
- `email` - Pre-fill customer email
- `phone` - Pre-fill customer phone
- `company` - Pre-fill company name

### 2. Context Data (Advanced)

Pass custom context data to personalize AI responses:

```html
<script>
const contextData = {
  userId: "user_123",
  planType: "premium",
  accountAge: "6 months",
  recentPurchase: "Pro Plan Upgrade",
  customField: "Any data you need"
};

const encodedContext = encodeURIComponent(JSON.stringify(contextData));
const widgetUrl = `https://your-domain.replit.app/chat?context=${encodedContext}`;

document.getElementById('chat-iframe').src = widgetUrl;
</script>
```

**Benefits of Context Data:**
- AI responses tailored to user's account
- Support agents see user context
- Better, faster support experience
- No need for customers to repeat information

### 3. Styling & Theming

#### Custom Colors
```html
<iframe 
  src="https://your-domain.replit.app/chat?
    primaryColor=3b82f6
    &bgColor=ffffff
    &textColor=1f2937
  "
></iframe>
```

#### Dark Mode Support
The widget automatically adapts to user's system preferences. Force dark mode:
```html
<iframe src="https://your-domain.replit.app/chat?theme=dark"></iframe>
```

#### Custom CSS (Advanced)
For deep customization, fork the widget component and modify:
- `client/src/components/CustomerChatWidget.tsx`
- `client/src/pages/EmbedChatWidget.tsx`

---

## 📱 Mobile Optimization

### Responsive Design
The widget is fully responsive. For mobile-optimized experience:

```html
<script>
const isMobile = window.innerWidth <= 768;

if (isMobile) {
  // Full-screen on mobile
  const iframe = document.createElement('iframe');
  iframe.src = 'https://your-domain.replit.app/chat';
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    z-index: 999999;
    display: none;
  `;
  
  // Show/hide logic
  document.getElementById('open-chat').addEventListener('click', () => {
    iframe.style.display = 'block';
  });
  
  document.body.appendChild(iframe);
} else {
  // Standard widget for desktop
  // Use floating button method
}
</script>
```

---

## 🔒 Security & Authentication

### API Key Authentication (Coming Soon)

For authenticated users, pass API key and user token:

```javascript
fetch('https://your-domain.replit.app/api/widget/auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    userId: 'user_123',
    email: 'user@example.com',
    name: 'John Doe'
  })
})
.then(res => res.json())
.then(data => {
  const widgetUrl = `https://your-domain.replit.app/chat?token=${data.token}`;
  document.getElementById('chat-iframe').src = widgetUrl;
});
```

### CORS Configuration
The widget handles CORS automatically. To restrict domains:

1. Add allowed origins to server configuration
2. Implement domain whitelist
3. Validate `Origin` header in webhook endpoints

---

## 🔔 Events & Callbacks

### Listen to Widget Events

```html
<script>
window.addEventListener('message', function(event) {
  // Verify origin
  if (event.origin !== 'https://your-domain.replit.app') return;
  
  const { type, data } = event.data;
  
  switch(type) {
    case 'chat:opened':
      console.log('Chat widget opened');
      // Track analytics
      break;
      
    case 'chat:closed':
      console.log('Chat widget closed');
      break;
      
    case 'message:sent':
      console.log('Customer sent message:', data.message);
      break;
      
    case 'message:received':
      console.log('Agent replied:', data.message);
      break;
      
    case 'conversation:started':
      console.log('New conversation:', data.conversationId);
      // Store conversation ID
      localStorage.setItem('conversationId', data.conversationId);
      break;
  }
});
</script>
```

### Send Commands to Widget

```javascript
// Send command to widget
const iframe = document.getElementById('chat-iframe');
iframe.contentWindow.postMessage({
  type: 'chat:open',
  // or 'chat:close', 'chat:minimize', etc.
}, 'https://your-domain.replit.app');
```

---

## 📊 Analytics Integration

### Google Analytics

```html
<script>
window.addEventListener('message', function(event) {
  if (event.origin !== 'https://your-domain.replit.app') return;
  
  const { type, data } = event.data;
  
  // Track with GA4
  if (window.gtag) {
    switch(type) {
      case 'chat:opened':
        gtag('event', 'chat_widget_opened');
        break;
      case 'message:sent':
        gtag('event', 'chat_message_sent', {
          conversation_id: data.conversationId
        });
        break;
      case 'conversation:started':
        gtag('event', 'chat_conversation_started', {
          conversation_id: data.conversationId
        });
        break;
    }
  }
});
</script>
```

### Mixpanel / Amplitude

```javascript
// Track with Mixpanel
mixpanel.track('Chat Widget Interaction', {
  action: event.data.type,
  conversation_id: event.data.conversationId
});

// Track with Amplitude
amplitude.track('Chat Widget Event', {
  event_type: event.data.type,
  conversation_id: event.data.conversationId
});
```

---

## 🛠️ Advanced Implementations

### React Integration

```tsx
import { useEffect, useRef } from 'react';

function ChatWidget({ userId, userEmail }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    const contextData = {
      userId,
      userEmail,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    };
    
    const encodedContext = encodeURIComponent(JSON.stringify(contextData));
    const widgetUrl = `https://your-domain.replit.app/chat?context=${encodedContext}`;
    
    if (iframeRef.current) {
      iframeRef.current.src = widgetUrl;
    }
  }, [userId, userEmail]);
  
  return (
    <iframe
      ref={iframeRef}
      className="fixed bottom-5 right-5 w-96 h-[600px] rounded-xl shadow-xl"
      allow="camera; microphone"
    />
  );
}
```

### Vue.js Integration

```vue
<template>
  <iframe
    :src="widgetUrl"
    class="chat-widget"
    allow="camera; microphone"
  />
</template>

<script>
export default {
  props: ['userId', 'userEmail'],
  computed: {
    widgetUrl() {
      const contextData = {
        userId: this.userId,
        userEmail: this.userEmail
      };
      const encoded = encodeURIComponent(JSON.stringify(contextData));
      return `https://your-domain.replit.app/chat?context=${encoded}`;
    }
  }
}
</script>
```

### WordPress Plugin

```php
<?php
/*
Plugin Name: Support Board Chat Widget
*/

function support_board_chat_widget() {
  $user = wp_get_current_user();
  $context_data = json_encode([
    'userId' => $user->ID,
    'email' => $user->user_email,
    'name' => $user->display_name,
  ]);
  
  $encoded_context = urlencode($context_data);
  $widget_url = "https://your-domain.replit.app/chat?context={$encoded_context}";
  
  echo "<script>
    (function() {
      const iframe = document.createElement('iframe');
      iframe.src = '{$widget_url}';
      iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;';
      document.body.appendChild(iframe);
    })();
  </script>";
}

add_action('wp_footer', 'support_board_chat_widget');
?>
```

---

## 🧪 Testing the Widget

### Test Checklist
- [ ] Widget loads correctly
- [ ] Context data passes through
- [ ] Customer can send messages
- [ ] AI responds appropriately
- [ ] File attachments work
- [ ] Emoji picker functions
- [ ] Conversation persists on reload
- [ ] Mobile responsive
- [ ] Works across different browsers
- [ ] Analytics events fire correctly

### Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🎯 Best Practices

### 1. Performance
- Load widget asynchronously to avoid blocking page load
- Use lazy loading for iframe
- Minimize context data size

### 2. User Experience
- Position widget where it doesn't obstruct content
- Show clear indication when new messages arrive
- Allow users to minimize/close widget
- Persist conversation across page navigation

### 3. Privacy & Compliance
- Inform users about chat data collection
- Provide opt-out mechanism
- Follow GDPR/CCPA guidelines
- Secure sensitive data in context

### 4. Accessibility
- Ensure keyboard navigation works
- Provide ARIA labels
- Support screen readers
- Maintain sufficient color contrast

---

## 📈 Optimization Tips

### Reduce Load Time
```html
<!-- Lazy load widget -->
<script>
  // Load widget only when user shows intent
  let widgetLoaded = false;
  
  document.addEventListener('mousemove', loadWidget, { once: true });
  document.addEventListener('scroll', loadWidget, { once: true });
  
  function loadWidget() {
    if (widgetLoaded) return;
    widgetLoaded = true;
    
    const script = document.createElement('script');
    script.src = '/path/to/widget-loader.js';
    document.body.appendChild(script);
  }
</script>
```

### Preconnect to Domain
```html
<link rel="preconnect" href="https://your-domain.replit.app">
<link rel="dns-prefetch" href="https://your-domain.replit.app">
```

---

## 🔧 Troubleshooting

### Widget Not Loading
- Check HTTPS (required for iframe embedding)
- Verify domain in CORS settings
- Check browser console for errors
- Ensure iframe `src` URL is correct

### Messages Not Sending
- Check network tab for API errors
- Verify WebSocket connection
- Check customer info is captured
- Review server logs

### Context Data Not Working
- Verify JSON is properly encoded
- Check URL parameter format
- Ensure context data size is reasonable (<5KB)
- Validate JSON structure

---

## 🚀 Next Steps

1. **Choose Embedding Method**: Iframe vs. Floating button
2. **Customize Appearance**: Colors, position, greeting
3. **Add Context Data**: Enhance support with user info
4. **Test Thoroughly**: All features and browsers
5. **Monitor Analytics**: Track usage and engagement
6. **Optimize**: Performance and user experience

For more help:
- Check `client/src/components/CustomerChatWidget.tsx` for widget code
- Review `client/src/pages/EmbedChatWidget.tsx` for iframe setup
- See external integrations guide for channel-specific setup
