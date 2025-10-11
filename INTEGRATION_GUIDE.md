# Support Board - Integration Guide

Integrate the AI-powered support center into your website or mobile app with API key authentication for full access to conversation history, support tickets, and feed.

## Table of Contents
- [Website Integration](#website-integration)
  - [Enhanced Support Center (Recommended)](#enhanced-support-center-recommended)
  - [Basic Chat Widget](#basic-chat-widget)
- [API Key Authentication](#api-key-authentication)
- [Mobile App Integration](#mobile-app-integration)
- [Context Data](#context-data)
- [API Reference](#api-reference)
- [Examples](#examples)

---

## Website Integration

### Enhanced Support Center (Recommended)

The enhanced support center widget provides full access to conversation history, support tickets, and news feed with API key authentication.

#### Step 1: Get Your API Key

Contact your Support Board administrator to get an API key with the required permissions:
- `chat` - Enable customer chat
- `history` - View conversation history
- `tickets` - Access support tickets
- `feed` - View news and updates

#### Step 2: Add Widget to Your Website

Add this code to your website before the closing `</body>` tag:

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    apiKey: 'your-api-key-here',  // Required for full support center features
    customer: {
      name: 'John Doe',
      email: 'john@example.com',   // Required
      phone: '+1234567890',         // Optional
      company: 'Acme Inc'           // Optional
    },
    contextData: {
      // Your custom context data here
      userId: '12345',
      planType: 'premium',
      productId: 'abc-789'
    },
    styles: {
      buttonColor: '#3b82f6',      // Optional: Custom button color
      width: '450px',               // Optional: Widget width (default: 450px)
      height: '700px'               // Optional: Widget height (default: 700px)
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

#### Features

The enhanced support center widget includes:
- **Chat Tab**: Real-time AI-powered customer support
- **History Tab**: View all past conversations
- **Tickets Tab**: Access and track support tickets
- **Feed Tab**: View company news and updates
- **Fullscreen Mode**: Toggle between widget and fullscreen view

### Basic Chat Widget (Legacy)

For basic chat without API key authentication:

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
      buttonColor: '#3b82f6',
      width: '400px',
      height: '600px'
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### Programmatic Control

Control the widget programmatically using JavaScript:

```javascript
// Open the support center widget
window.SupportBoard.open();

// Close the support center widget
window.SupportBoard.close();

// Update context data dynamically
window.SupportBoard.updateContext({
  userId: '67890',
  currentPage: '/checkout',
  cartValue: 299.99
});

// Get the current customer ID (useful for tracking)
const customerId = window.SupportBoard.getCustomerId();
console.log('Customer ID:', customerId);
```

---

## API Key Authentication

API keys provide secure access to the enhanced support center features including conversation history, support tickets, and feed.

### Getting an API Key

1. Log in to your Support Board admin panel
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Enter organization details:
   - **Organization Name**: Your company name
   - **Permissions**: Select required permissions
     - `chat` - Enable customer chat
     - `history` - View conversation history  
     - `tickets` - Access support tickets
     - `feed` - View news and updates
   - **Allowed Domains** (optional): Restrict API key to specific domains
   - **Rate Limit** (optional): Set request limit per hour
5. Copy the generated API key and add it to your widget configuration

### Security Best Practices

- **Never expose API keys in public repositories**
- Store API keys securely on your server
- Use domain restrictions to limit API key usage
- Rotate API keys periodically
- Monitor API key usage in the admin panel
- Revoke unused or compromised API keys immediately

### API Key Permissions

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `chat` | Create conversations and send messages | `POST /api/widget/customer` |
| `history` | View conversation history | `GET /api/widget/conversations/:customerId`<br>`GET /api/widget/conversations/:conversationId/messages` |
| `tickets` | Access support tickets | `GET /api/widget/tickets/:customerId` |
| `feed` | View news and updates | `GET /api/widget/feed` |

### Multi-Tenant Data Isolation

API keys are scoped to your organization, ensuring:
- Customers are automatically associated with your organization
- Only your organization's data is accessible
- Complete data isolation from other organizations
- Secure multi-tenant architecture

### E-commerce Example (Enhanced Support Center)

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    apiKey: 'your-api-key-here',       // Required for support center features
    customer: {
      name: getCurrentUser().name,
      email: getCurrentUser().email,   // Required
      phone: getCurrentUser().phone,
      company: getCurrentUser().company
    },
    contextData: {
      userId: getUserId(),              // Your user ID
      planType: 'premium',              // User's plan
      productId: getCurrentProductId(), // Current product
      cartItems: getCartItems(),        // Shopping cart
      orderHistory: hasOrders()         // Order history
    },
    styles: {
      buttonColor: '#10b981',           // Match your brand
      width: '450px',
      height: '700px'
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### SaaS Platform Example (Enhanced Support Center)

```html
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    apiKey: 'your-api-key-here',       // Required for support center features
    customer: {
      name: getCurrentUser().name,
      email: getCurrentUser().email,   // Required
      phone: getCurrentUser().phone,
      company: getCurrentUser().company
    },
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
    },
    styles: {
      buttonColor: '#6366f1',           // Match your brand
      width: '450px',
      height: '700px'
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

---

## Mobile App Integration

### React Native (Enhanced Support Center)

```javascript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const SupportCenterWidget = ({ apiKey, customer, contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const apiUrl = 'https://your-support-board.replit.app';
  
  // Build support center URL with API key and customer info
  const buildWidgetUrl = () => {
    const url = new URL('/support-widget', apiUrl);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('customerId', customer.id || 'new');
    if (contextData) {
      url.searchParams.set('context', encodeURIComponent(JSON.stringify(contextData)));
    }
    return url.toString();
  };

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
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          {isOpen ? '✕' : '?'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <WebView
          source={{ uri: buildWidgetUrl() }}
          style={{
            position: 'absolute',
            bottom: 90,
            right: 20,
            width: 380,
            height: 600,
            borderRadius: 12
          }}
        />
      )}
    </View>
  );
};

// Usage with API key
<SupportCenterWidget 
  apiKey="your-api-key-here"
  customer={{
    id: 'customer-123',
    name: 'John Doe',
    email: 'john@example.com'
  }}
  contextData={{
    userId: 'user123',
    appVersion: '2.1.0',
    platform: 'iOS',
    subscription: 'premium'
  }}
/>
```

### React Native (Basic Chat - Legacy)

For basic chat without API key (limited features):

```javascript
// Use /chat endpoint instead of /support-widget
const chatUrl = `${apiUrl}/chat?context=${encodeURIComponent(JSON.stringify(contextData))}`;
```

### Flutter (Enhanced Support Center)

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert';

class SupportCenterWidget extends StatefulWidget {
  final String apiKey;
  final Map<String, dynamic> customer;
  final Map<String, dynamic> contextData;
  
  const SupportCenterWidget({
    Key? key, 
    required this.apiKey,
    required this.customer,
    required this.contextData
  }) : super(key: key);

  @override
  _SupportCenterWidgetState createState() => _SupportCenterWidgetState();
}

class _SupportCenterWidgetState extends State<SupportCenterWidget> {
  bool _isOpen = false;
  final String apiUrl = 'https://your-support-board.replit.app';
  
  String get widgetUrl {
    final customerId = widget.customer['id'] ?? 'new';
    final contextEncoded = Uri.encodeComponent(json.encode(widget.contextData));
    return '$apiUrl/support-widget?apiKey=${widget.apiKey}&customerId=$customerId&context=$contextEncoded';
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
            child: Icon(_isOpen ? Icons.close : Icons.support_agent),
          ),
        ),
        if (_isOpen)
          Positioned(
            bottom: 90,
            right: 20,
            width: 380,
            height: 600,
            child: Card(
              child: WebView(
                initialUrl: widgetUrl,
                javascriptMode: JavascriptMode.unrestricted,
              ),
            ),
          ),
      ],
    );
  }
}

// Usage with API key
SupportCenterWidget(
  apiKey: 'your-api-key-here',
  customer: {
    'id': 'customer-123',
    'name': 'Jane Doe',
    'email': 'jane@example.com',
  },
  contextData: {
    'userId': 'user123',
    'appVersion': '1.0.0',
    'platform': 'android',
    'subscription': 'free'
  },
)
```

### REST API Integration (Enhanced Support Center)

For native apps or custom implementations, use the authenticated REST API:

```javascript
const API_KEY = 'your-api-key-here';
const API_URL = 'https://your-support-board.replit.app';

// Create or get customer
async function createCustomer(customerInfo, contextData) {
  const response = await fetch(`${API_URL}/api/widget/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone || '',
      company: customerInfo.company || '',
      contextData: contextData
    })
  });

  const { data } = await response.json();
  return data; // Returns customer object with id
}

// Get conversation history
async function getConversationHistory(customerId) {
  const response = await fetch(`${API_URL}/api/widget/conversations/${customerId}`, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  const { data } = await response.json();
  return data; // Returns array of conversations
}

// Get conversation messages
async function getMessages(conversationId) {
  const response = await fetch(`${API_URL}/api/widget/conversations/${conversationId}/messages`, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  const { data } = await response.json();
  return data; // Returns array of messages
}

// Get support tickets
async function getTickets(customerId) {
  const response = await fetch(`${API_URL}/api/widget/tickets/${customerId}`, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  const { data } = await response.json();
  return data; // Returns array of tickets
}

// Get feed posts
async function getFeedPosts() {
  const response = await fetch(`${API_URL}/api/widget/feed`, {
    headers: {
      'x-api-key': API_KEY
    }
  });

  const { data } = await response.json();
  return data; // Returns array of posts
}
```

### REST API Integration (Legacy - Basic Chat)

For basic chat without API key (limited features):

```javascript
// Legacy endpoint - no API key required
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
      contextData: contextData
    })
  });

  const { customerId, conversationId } = await response.json();
  return { customerId, conversationId };
}

// Legacy get messages
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

### Authenticated Widget API Endpoints

All widget API endpoints require API key authentication via the `x-api-key` header.

#### Create or Get Customer
```
POST /api/widget/customer
```

**Headers:**
```
x-api-key: your-api-key
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "contextData": {
    "userId": "user123",
    "planType": "premium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Inc",
    "organizationId": "org-uuid"
  }
}
```

**Required Permission:** `chat`

---

#### Get Conversation History
```
GET /api/widget/conversations/:customerId
```

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-uuid",
      "title": "Upgrade Plan Inquiry",
      "status": "open",
      "priority": "medium",
      "createdAt": "2024-01-10T10:30:00Z"
    }
  ]
}
```

**Required Permission:** `history`

---

#### Get Conversation Messages
```
GET /api/widget/conversations/:conversationId/messages
```

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid",
      "content": "How do I upgrade my plan?",
      "senderType": "customer",
      "senderName": "John Doe",
      "timestamp": "2024-01-10T10:30:00Z"
    },
    {
      "id": "msg-uuid-2",
      "content": "I can help you upgrade...",
      "senderType": "agent",
      "senderName": "AI Assistant",
      "timestamp": "2024-01-10T10:30:05Z"
    }
  ]
}
```

**Required Permission:** `history`

---

#### Get Support Tickets
```
GET /api/widget/tickets/:customerId
```

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket-uuid",
      "title": "Login Issue",
      "description": "Cannot access account",
      "status": "open",
      "priority": "high",
      "category": "Technical",
      "createdAt": "2024-01-10T09:00:00Z"
    }
  ]
}
```

**Required Permission:** `tickets`

---

#### Get Feed Posts
```
GET /api/widget/feed
```

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "content": "New Feature Released!",
      "authorName": "Product Team",
      "visibility": "all_customers",
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

**Required Permission:** `feed`

---

### Legacy Chat Endpoints (Unauthenticated)

The following endpoints remain available for basic chat without API key:

#### Initialize Customer Chat (Legacy)
```
POST /api/customer-chat/create-customer
```

**Note:** Limited to basic chat functionality. Does not provide access to conversation history, tickets, or feed.

---

## Examples

### WordPress Plugin (Enhanced Support Center)

```php
<?php
/**
 * Plugin Name: Support Board Enhanced Widget
 */

function support_board_enhanced_widget() {
    $user = wp_get_current_user();
    $customer_data = array(
        'name' => $user->display_name,
        'email' => $user->user_email,
        'phone' => get_user_meta($user->ID, 'billing_phone', true),
        'company' => get_user_meta($user->ID, 'billing_company', true)
    );
    
    $context_data = array(
        'userId' => $user->ID,
        'memberSince' => $user->user_registered,
        'roles' => $user->roles,
        'currentPage' => $_SERVER['REQUEST_URI']
    );
    ?>
    <script>
        window.SupportBoardConfig = {
            apiUrl: '<?php echo get_option('support_board_url'); ?>',
            apiKey: '<?php echo get_option('support_board_api_key'); ?>',
            customer: <?php echo json_encode($customer_data); ?>,
            contextData: <?php echo json_encode($context_data); ?>,
            styles: {
                buttonColor: '#0073aa',
                width: '450px',
                height: '700px'
            }
        };
    </script>
    <script src="<?php echo get_option('support_board_url'); ?>/support-widget.js"></script>
    <?php
}
add_action('wp_footer', 'support_board_enhanced_widget');
```

### Shopify Integration (Enhanced Support Center)

```liquid
<!-- Add to theme.liquid before </body> -->
<script>
  window.SupportBoardConfig = {
    apiUrl: 'https://your-support-board.replit.app',
    apiKey: '{{ settings.support_board_api_key }}',
    {% if customer %}
    customer: {
      name: '{{ customer.name }}',
      email: '{{ customer.email }}',
      phone: '{{ customer.phone }}',
      company: '{{ customer.default_address.company }}'
    },
    {% endif %}
    contextData: {
      {% if customer %}
      userId: '{{ customer.id }}',
      orderCount: {{ customer.orders_count }},
      totalSpent: {{ customer.total_spent | money_without_currency }},
      {% endif %}
      cart: {
        items: {{ cart.item_count }},
        total: {{ cart.total_price | money_without_currency }}
      },
      currentPage: '{{ request.path }}'
    },
    styles: {
      buttonColor: '#5c6ac4',
      width: '450px',
      height: '700px'
    }
  };
</script>
<script src="https://your-support-board.replit.app/support-widget.js"></script>
```

### Next.js Integration (Enhanced Support Center)

```jsx
// components/SupportWidget.jsx
import { useEffect } from 'react';
import { useUser } from '@/hooks/useUser';

export default function SupportWidget() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    window.SupportBoardConfig = {
      apiUrl: process.env.NEXT_PUBLIC_SUPPORT_BOARD_URL,
      apiKey: process.env.NEXT_PUBLIC_SUPPORT_BOARD_API_KEY,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company
      },
      contextData: {
        userId: user.id,
        subscription: user.subscription,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        currentPage: window.location.pathname
      },
      styles: {
        buttonColor: '#0070f3',
        width: '450px',
        height: '700px'
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
