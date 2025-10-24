# Third-Party Integration API Documentation

## Overview

The Third-Party Integration API allows external applications to create support conversations with pre-filled customer information, completely bypassing the customer information form. This is perfect for embedding support chat in your application when you already know who the customer is.

## Authentication

All API requests must include an API key in the headers:

```
X-API-Key: your_api_key_here
```

Or using Bearer token:

```
Authorization: Bearer your_api_key_here
```

**Setting up API Key:**
Set the `EXTERNAL_API_KEY` environment variable in your `.env` file:

```env
EXTERNAL_API_KEY=your_secure_random_key_here
```

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP address
- **Response on limit:** HTTP 429 with error message

---

## Endpoint: Start Conversation

**Create a new support conversation with pre-filled customer data**

### Request

```http
POST /api/integrations/start-conversation
Content-Type: application/json
X-API-Key: your_api_key_here
```

### Request Body

```json
{
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Inc"
  },
  "contextData": {
    "productId": "prod_123",
    "pageUrl": "https://yourapp.com/products/item-123",
    "customField1": "value1",
    "customField2": "value2"
  },
  "organizationId": "org_456",
  "initialMessage": "I need help with my order #12345",
  "aiEnabled": true
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer` | Object | ✅ Yes | Customer information |
| `customer.name` | String | ✅ Yes | Customer's full name |
| `customer.email` | String | ✅ Yes | Valid email address |
| `customer.phone` | String | ❌ No | Phone number |
| `customer.company` | String | ❌ No | Company/business name |
| `contextData` | Object | ❌ No | Custom integration context (product info, page URL, etc.) |
| `organizationId` | String | ❌ No | Your organization ID for multi-tenant support |
| `initialMessage` | String | ❌ No | First message to start the conversation |
| `aiEnabled` | Boolean | ❌ No | Enable AI auto-response (default: true) |

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "conversationId": "conv_789",
  "customerId": "cust_101",
  "sessionId": "sess_202",
  "websocketUrl": "wss://your-app.replit.app",
  "chatUrl": "https://your-app.replit.app/customer-chat/conv_789?sessionId=sess_202",
  "message": "Conversation started successfully"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` on success |
| `conversationId` | String | Unique conversation identifier |
| `customerId` | String | Customer record identifier |
| `sessionId` | String | Session identifier for this conversation |
| `websocketUrl` | String | WebSocket server URL for real-time updates |
| `chatUrl` | String | Direct URL to the customer chat interface |
| `message` | String | Success message |

#### Error Responses

**400 Bad Request** - Invalid request data
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "customer.email: Valid email is required"
}
```

**401 Unauthorized** - Missing or invalid API key
```json
{
  "error": "Invalid or missing API key"
}
```

**429 Too Many Requests** - Rate limit exceeded
```json
{
  "error": "Too many API requests, please try again later."
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "error": "Failed to start conversation",
  "details": "Error message here"
}
```

---

## Integration Examples

### Example 1: Basic Integration (JavaScript/Node.js)

```javascript
const axios = require('axios');

async function startSupportChat(customerData) {
  try {
    const response = await axios.post(
      'https://your-support.replit.app/api/integrations/start-conversation',
      {
        customer: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company
        },
        initialMessage: "I need help with my account",
        aiEnabled: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.SUPPORT_API_KEY
        }
      }
    );

    // Redirect customer to chat URL
    window.location.href = response.data.chatUrl;
    
    return response.data;
  } catch (error) {
    console.error('Failed to start chat:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
startSupportChat({
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "+1-555-0123",
  company: "Tech Corp"
});
```

### Example 2: E-commerce Integration with Product Context

```javascript
async function startProductSupportChat(customer, product) {
  const response = await fetch(
    'https://your-support.replit.app/api/integrations/start-conversation',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key_here'
      },
      body: JSON.stringify({
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          company: customer.company
        },
        contextData: {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          pageUrl: window.location.href,
          cartTotal: customer.cartTotal,
          isPremiumMember: customer.isPremiumMember
        },
        initialMessage: `I have a question about ${product.name}`,
        aiEnabled: true,
        organizationId: 'your_org_id'
      })
    }
  );

  const data = await response.json();
  
  if (data.success) {
    // Open chat in iframe or new window
    openChatWidget(data.chatUrl);
  }
}
```

### Example 3: Python Integration

```python
import requests
import os

def start_conversation(customer_data, initial_message=None):
    url = "https://your-support.replit.app/api/integrations/start-conversation"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": os.getenv("SUPPORT_API_KEY")
    }
    
    payload = {
        "customer": {
            "name": customer_data["name"],
            "email": customer_data["email"],
            "phone": customer_data.get("phone"),
            "company": customer_data.get("company")
        },
        "aiEnabled": True
    }
    
    if initial_message:
        payload["initialMessage"] = initial_message
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Usage
result = start_conversation(
    {
        "name": "Alice Johnson",
        "email": "alice@company.com",
        "phone": "+1-555-9876",
        "company": "Enterprise Corp"
    },
    initial_message="Need help with billing"
)

print(f"Chat URL: {result['chatUrl']}")
print(f"Conversation ID: {result['conversationId']}")
```

### Example 4: React Component Integration

```jsx
import React, { useState } from 'react';

function SupportChatButton({ customer }) {
  const [loading, setLoading] = useState(false);

  const openSupport = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        'https://your-support.replit.app/api/integrations/start-conversation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.REACT_APP_SUPPORT_API_KEY
          },
          body: JSON.stringify({
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              company: customer.company
            },
            contextData: {
              userId: customer.id,
              subscriptionTier: customer.tier,
              pageUrl: window.location.href
            },
            aiEnabled: true
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // Open in modal/iframe or redirect
        window.open(data.chatUrl, '_blank', 'width=500,height=700');
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Failed to start support chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={openSupport} disabled={loading}>
      {loading ? 'Opening Chat...' : 'Contact Support'}
    </button>
  );
}
```

---

## Behavior Notes

### Customer Records

1. **Existing Customers**: If a customer with the same email already exists, the API will:
   - Use the existing customer record
   - Update name, phone, and company if new values are provided
   - Create a new conversation for that customer

2. **New Customers**: If no customer exists with the given email:
   - A new customer record is created
   - A new conversation is created automatically

### Context Data

The `contextData` field is stored as JSON and can include any custom data you need:
- Product/order information
- Page URLs
- User preferences
- Account tiers
- Shopping cart data
- Custom fields

This context is available to:
- AI agents (for better responses)
- Human support staff (for better assistance)
- Your analytics systems

### AI Assistance

When `aiEnabled` is `true` (default):
- AI will automatically respond to customer messages
- AI has access to your knowledge base
- AI will hand off to humans when confidence is low
- AI can route to specialized agents (Sales, Technical, Billing, etc.)

When `aiEnabled` is `false`:
- Messages go directly to human staff
- No automated AI responses
- Staff must respond manually

---

## Use Cases

### 1. SaaS Dashboard Integration
Add a "Help" button in your SaaS app that opens support chat with customer context already filled in.

### 2. E-commerce Product Pages
Let customers ask questions about products without filling out contact forms.

### 3. Mobile App Support
Integrate support chat in your mobile app using the API to pass user data.

### 4. Post-Purchase Support
Automatically start conversations after purchases with order context pre-loaded.

### 5. Account Portal
Add instant support access in customer account portals with their info pre-filled.

---

## Security Best Practices

1. **Never expose API keys in client-side code**
   - Make API calls from your backend server
   - Use server-side environment variables

2. **Validate customer data**
   - Ensure email addresses are valid
   - Sanitize phone numbers and company names

3. **Use HTTPS only**
   - All API calls must use HTTPS
   - Never send API keys over HTTP

4. **Rotate API keys regularly**
   - Update `EXTERNAL_API_KEY` periodically
   - Use different keys for different environments

5. **Monitor usage**
   - Track API calls for unusual patterns
   - Set up alerts for rate limit hits

---

## Testing

### Test with cURL

```bash
curl -X POST https://your-support.replit.app/api/integrations/start-conversation \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "customer": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "+1234567890",
      "company": "Test Company"
    },
    "initialMessage": "This is a test message",
    "aiEnabled": true
  }'
```

### Test Response

```json
{
  "success": true,
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "660e8400-e29b-41d4-a716-446655440111",
  "sessionId": "770e8400-e29b-41d4-a716-446655440222",
  "websocketUrl": "wss://your-support.replit.app",
  "chatUrl": "https://your-support.replit.app/customer-chat/550e8400-e29b-41d4-a716-446655440000?sessionId=770e8400-e29b-41d4-a716-446655440222",
  "message": "Conversation started successfully"
}
```

---

## Support

For questions or issues with the API:
- Check error messages in responses
- Review server logs for detailed error information
- Contact technical support with conversation IDs for troubleshooting

---

## Changelog

### v1.0.0 (Current)
- Initial release
- Start conversation endpoint
- Customer data pre-fill
- Context data support
- Multi-tenant support
- AI toggle support
