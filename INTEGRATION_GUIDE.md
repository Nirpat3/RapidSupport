# Support Board - Integration Guide

Integrate the AI-powered chat agent into your website or mobile app with custom context data for personalized support.

## Table of Contents
- [Website Integration](#website-integration)
- [Mobile App Integration](#mobile-app-integration)
- [Context Data](#context-data)
- [API Reference](#api-reference)
- [Examples](#examples)

---

## Website Integration

### Quick Start

Add this code to your website before the closing `</body>` tag:

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    contextData: {
      // Your custom context data here
      userId: '12345',
      planType: 'premium',
      productId: 'abc-789'
    },
    styles: {
      buttonColor: '#3b82f6', // Optional: Custom button color
      width: '400px',          // Optional: Widget width
      height: '600px'          // Optional: Widget height
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### Programmatic Control

Control the widget programmatically using JavaScript:

```javascript
// Open the chat widget
window.SupportBoard.open();

// Close the chat widget
window.SupportBoard.close();

// Update context data dynamically
window.SupportBoard.updateContext({
  userId: '67890',
  currentPage: '/checkout',
  cartValue: 299.99
});
```

### E-commerce Example

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    contextData: {
      userId: getUserId(),              // Your user ID
      planType: 'premium',               // User's plan
      productId: getCurrentProductId(), // Current product
      cartItems: getCartItems(),         // Shopping cart
      orderHistory: hasOrders()          // Order history
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### SaaS Platform Example

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    contextData: {
      userId: getCurrentUser().id,
      accountType: getCurrentUser().accountType,
      subscription: {
        plan: 'Business',
        status: 'active',
        nextBilling: '2024-12-01'
      },
      usage: {
        apiCalls: 15000,
        limit: 50000
      },
      features: ['api-access', 'advanced-analytics']
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

---

## Mobile App Integration

### React Native

```javascript
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const SupportChat = ({ userId, contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => 
    // Generate or retrieve session ID
    Math.random().toString(36).substring(7)
  );

  const apiUrl = 'https://your-support-board.replit.app';
  const chatUrl = `${apiUrl}/chat?session=${sessionId}&context=${encodeURIComponent(JSON.stringify(contextData))}`;

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity 
        onPress={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#3b82f6',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontSize: 24 }}>💬</Text>
      </TouchableOpacity>

      {isOpen && (
        <WebView
          source={{ uri: chatUrl }}
          style={{
            position: 'absolute',
            bottom: 90,
            right: 20,
            width: 350,
            height: 500,
            borderRadius: 12
          }}
        />
      )}
    </View>
  );
};

// Usage
<SupportChat 
  userId="user123"
  contextData={{
    userId: 'user123',
    appVersion: '2.1.0',
    platform: 'iOS',
    subscription: 'premium'
  }}
/>
```

### Flutter

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert';

class SupportChatWidget extends StatefulWidget {
  final Map<String, dynamic> contextData;
  
  const SupportChatWidget({Key? key, required this.contextData}) : super(key: key);

  @override
  _SupportChatWidgetState createState() => _SupportChatWidgetState();
}

class _SupportChatWidgetState extends State<SupportChatWidget> {
  bool _isOpen = false;
  final String apiUrl = 'https://your-support-board.replit.app';
  
  String get chatUrl {
    final sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    final contextEncoded = Uri.encodeComponent(json.encode(widget.contextData));
    return '$apiUrl/chat?session=$sessionId&context=$contextEncoded';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          bottom: 20,
          right: 20,
          child: FloatingActionButton(
            onPressed: () => setState(() => _isOpen = !_isOpen),
            backgroundColor: Colors.blue,
            child: Icon(_isOpen ? Icons.close : Icons.chat),
          ),
        ),
        if (_isOpen)
          Positioned(
            bottom: 90,
            right: 20,
            width: 350,
            height: 500,
            child: Card(
              child: WebView(
                initialUrl: chatUrl,
                javascriptMode: JavascriptMode.unrestricted,
              ),
            ),
          ),
      ],
    );
  }
}

// Usage
SupportChatWidget(
  contextData: {
    'userId': 'user123',
    'appVersion': '1.0.0',
    'platform': 'android',
    'subscription': 'free'
  },
)
```

### REST API Integration

For native apps or custom implementations, use the REST API directly:

```javascript
// Initialize chat with context
async function initializeChat(customerInfo, contextData) {
  const response = await fetch('https://your-support-board.replit.app/api/customer-chat/create-customer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      company: customerInfo.company,
      sessionId: generateSessionId(),
      contextData: contextData // Custom context data
    })
  });

  const { customerId, conversationId } = await response.json();
  return { customerId, conversationId };
}

// Send message
async function sendMessage(conversationId, customerId, message) {
  const response = await fetch('https://your-support-board.replit.app/api/customer-chat/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversationId,
      customerId,
      content: message
    })
  });

  return await response.json();
}

// Get messages
async function getMessages(conversationId) {
  const response = await fetch(`https://your-support-board.replit.app/api/customer-chat/messages/${conversationId}`);
  return await response.json();
}
```

---

## Context Data

Context data allows the AI agent to provide personalized, relevant responses based on user-specific information.

### What can you include?

```javascript
{
  // User Information
  userId: "user_12345",
  userName: "John Doe",
  email: "john@example.com",
  
  // Account Details
  planType: "premium",
  accountStatus: "active",
  memberSince: "2023-01-15",
  
  // Product/Service Context
  currentProduct: "Widget Pro",
  productId: "prod_789",
  productVersion: "2.1.0",
  
  // Usage Data
  lastLogin: "2024-01-10",
  usageStats: {
    apiCalls: 15000,
    storageUsed: "5GB"
  },
  
  // Shopping Context (E-commerce)
  cart: {
    items: 3,
    total: 299.99
  },
  recentOrders: ["ORD-001", "ORD-002"],
  
  // Page Context
  currentPage: "/checkout",
  referrer: "/products",
  
  // Technical Context
  platform: "web",
  browser: "Chrome",
  appVersion: "1.5.2",
  
  // Custom Business Data
  ticketCount: 2,
  lastIssueCategory: "billing",
  preferredLanguage: "en"
}
```

### How the AI uses context data

The AI agent receives the context data and uses it to:

1. **Personalize responses** - Address user by name, reference their plan/product
2. **Provide relevant solutions** - Offer help specific to their product version or issue
3. **Skip unnecessary questions** - Already knows user ID, plan type, etc.
4. **Proactive assistance** - Identify potential issues based on usage patterns
5. **Smart routing** - Route to appropriate specialist based on context

### Example AI Responses with Context

**Without Context:**
```
User: I need help with my account
AI: I'd be happy to help! Could you tell me more about your account issue?
```

**With Context (`{ userId: "123", planType: "premium", usageStats: { apiCalls: 48000, limit: 50000 }}`)**:
```
User: I need help with my account
AI: Hi John! I can see you're on our Premium plan and you're approaching your API limit 
    (48,000 of 50,000 calls used this month). Is this what you need help with, or 
    is there something else I can assist you with?
```

---

## API Reference

### Endpoints

#### Initialize Customer Chat
```
POST /api/customer-chat/create-customer
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "sessionId": "unique-session-id",
  "contextData": {
    "userId": "user123",
    "planType": "premium"
  }
}
```

**Response:**
```json
{
  "customerId": "cust_xyz",
  "conversationId": "conv_abc",
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp"
  }
}
```

#### Send Message
```
POST /api/customer-chat/send-message
```

**Body:**
```json
{
  "conversationId": "conv_abc",
  "customerId": "cust_xyz",
  "content": "How do I upgrade my plan?"
}
```

#### Get Messages
```
GET /api/customer-chat/messages/:conversationId
```

**Response:**
```json
[
  {
    "id": "msg_1",
    "content": "How do I upgrade my plan?",
    "senderType": "customer",
    "senderName": "John Doe",
    "timestamp": "2024-01-10T10:30:00Z"
  },
  {
    "id": "msg_2",
    "content": "I can help you upgrade! Based on your Premium plan...",
    "senderType": "agent",
    "senderName": "AI Assistant",
    "timestamp": "2024-01-10T10:30:05Z"
  }
]
```

---

## Examples

### WordPress Plugin

```php
<?php
/**
 * Plugin Name: Support Board Chat
 */

function support_board_widget() {
    $user = wp_get_current_user();
    $context_data = array(
        'userId' => $user->ID,
        'userName' => $user->display_name,
        'email' => $user->user_email,
        'memberSince' => $user->user_registered,
        'roles' => $user->roles,
        'currentPage' => $_SERVER['REQUEST_URI']
    );
    ?>
    <script>
        window.SupportBoardConfig = {
            apiUrl: '<?php echo get_option('support_board_url'); ?>',
            contextData: <?php echo json_encode($context_data); ?>
        };
    </script>
    <script src="<?php echo get_option('support_board_url'); ?>/support-widget.js"></script>
    <?php
}
add_action('wp_footer', 'support_board_widget');
```

### Shopify Integration

```liquid
<!-- Add to theme.liquid before </body> -->
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    contextData: {
      {% if customer %}
      userId: '{{ customer.id }}',
      email: '{{ customer.email }}',
      name: '{{ customer.name }}',
      orderCount: {{ customer.orders_count }},
      totalSpent: {{ customer.total_spent | money_without_currency }},
      {% endif %}
      cart: {
        items: {{ cart.item_count }},
        total: {{ cart.total_price | money_without_currency }}
      },
      currentPage: '{{ request.path }}'
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### Next.js Integration

```jsx
// components/SupportWidget.jsx
import { useEffect } from 'react';
import { useUser } from '@/hooks/useUser';

export default function SupportWidget() {
  const { user } = useUser();

  useEffect(() => {
    window.SupportBoardConfig = {
      apiUrl: process.env.NEXT_PUBLIC_SUPPORT_BOARD_URL,
      contextData: {
        userId: user?.id,
        email: user?.email,
        subscription: user?.subscription,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        currentPage: window.location.pathname
      }
    };

    const script = document.createElement('script');
    script.src = `${process.env.NEXT_PUBLIC_SUPPORT_BOARD_URL}/support-widget.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [user]);

  return null;
}

// In _app.js or layout.js
import SupportWidget from '@/components/SupportWidget';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <SupportWidget />
    </>
  );
}
```

---

## Best Practices

1. **Keep context data relevant** - Only include data that helps provide better support
2. **Update context dynamically** - Use `updateContext()` when user state changes
3. **Respect privacy** - Don't include sensitive data (passwords, payment details)
4. **Use unique session IDs** - Persist session ID for returning users
5. **Handle errors gracefully** - Provide fallback if widget fails to load
6. **Test with real data** - Verify AI responses make sense with your context

## Support

For help with integration:
- Documentation: https://your-support-board.replit.app/docs
- Email: support@yourdomain.com
- GitHub: https://github.com/yourorg/support-board
