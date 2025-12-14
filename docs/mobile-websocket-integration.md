# Mobile App WebSocket Integration Guide

This document provides technical specifications for integrating WebSocket real-time chat functionality into mobile applications (iOS/Android) for the Support Board customer support platform.

## WebSocket Connection

### Endpoint
```
wss://{your-domain}/ws/chat?customerId={customerId}&sessionId={sessionId}
```

### Connection Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `customerId` | string (UUID) | Unique customer identifier returned from customer creation API |
| `sessionId` | string (UUID) | Session identifier generated client-side and persisted locally |

### Example Connection (JavaScript/React Native)
```javascript
const protocol = 'wss:';
const host = 'your-app.example.com';
const wsUrl = `${protocol}//${host}/ws/chat?customerId=${customerId}&sessionId=${sessionId}`;

const ws = new WebSocket(wsUrl);
```

### Example Connection (Swift/iOS)
```swift
let customerId = "customer-uuid"
let sessionId = "session-uuid"
let urlString = "wss://your-app.example.com/ws/chat?customerId=\(customerId)&sessionId=\(sessionId)"

guard let url = URL(string: urlString) else { return }
let webSocket = URLSession.shared.webSocketTask(with: url)
webSocket.resume()
```

### Example Connection (Kotlin/Android)
```kotlin
val customerId = "customer-uuid"
val sessionId = "session-uuid"
val url = "wss://your-app.example.com/ws/chat?customerId=$customerId&sessionId=$sessionId"

val client = OkHttpClient()
val request = Request.Builder().url(url).build()
val webSocket = client.newWebSocket(request, webSocketListener)
```

## Authentication Flow

1. **Customer Creation**: First call the REST API to create/identify the customer
   - `POST /api/customer-chat/create-customer`
   - Returns `customerId` and `conversationId`

2. **WebSocket Connection**: Use the returned `customerId` with your stored `sessionId`

3. **Join Conversation**: After connection, send a join message:
```json
{
  "type": "join_conversation",
  "conversationId": "conversation-uuid"
}
```

## Message Types

### Outgoing Messages (Client to Server)

#### Join Conversation
```json
{
  "type": "join_conversation",
  "conversationId": "conversation-uuid"
}
```

#### Leave Conversation
```json
{
  "type": "leave_conversation",
  "conversationId": "conversation-uuid"
}
```

#### Typing Indicator
```json
{
  "type": "typing",
  "conversationId": "conversation-uuid"
}
```

#### Stop Typing
```json
{
  "type": "stop_typing",
  "conversationId": "conversation-uuid"
}
```

### Incoming Messages (Server to Client)

#### New Message
```json
{
  "type": "new_message",
  "conversationId": "conversation-uuid",
  "messageId": "message-uuid",
  "content": "Message text",
  "userId": "sender-uuid",
  "userName": "Agent Name",
  "userRole": "agent",
  "timestamp": "2025-12-14T03:00:00.000Z"
}
```

#### User Typing
```json
{
  "type": "user_typing",
  "conversationId": "conversation-uuid",
  "userId": "user-uuid",
  "userName": "Agent Name"
}
```

#### User Stopped Typing
```json
{
  "type": "user_stopped_typing",
  "userId": "user-uuid"
}
```

#### Conversation Update
```json
{
  "type": "conversation_update",
  "conversationId": "conversation-uuid"
}
```

#### AI Stream Complete
```json
{
  "type": "ai_stream_complete",
  "conversationId": "conversation-uuid"
}
```

## Recommended Implementation Patterns

### Connection Management
1. **Reconnection**: Implement automatic reconnection with exponential backoff (3s, 6s, 12s, etc.)
2. **State Persistence**: Store `customerId` and `sessionId` in local storage/keychain
3. **Connection Status**: Display connection status indicator to users

### Typing Indicators
1. Send `typing` event when user starts typing
2. Set a 2-second timeout after last keystroke
3. Send `stop_typing` when timeout fires or message is sent
4. Always send `stop_typing` before disconnecting

### Message Handling
1. When receiving `new_message`, either:
   - Append the message directly to local state, OR
   - Refetch messages via REST API for full sync
2. Handle `conversation_update` by refreshing conversation metadata
3. Handle `ai_stream_complete` to refresh and display AI responses

### Cleanup
Before closing the WebSocket connection:
```javascript
// 1. Stop typing indicator
ws.send(JSON.stringify({ type: 'stop_typing', conversationId }));

// 2. Leave conversation
ws.send(JSON.stringify({ type: 'leave_conversation', conversationId }));

// 3. Close connection
ws.close();

// 4. Clear local timers and state
```

## REST API Endpoints

### Create Customer and Conversation
```
POST /api/customer-chat/create-customer
Content-Type: application/json

{
  "name": "Customer Name",
  "email": "customer@example.com",
  "company": "Company Name",
  "phone": "+1234567890",
  "sessionId": "client-generated-uuid",
  "contextData": {
    "selectedCategory": "billing",
    "categoryLabel": "Billing"
  }
}

Response:
{
  "customerId": "customer-uuid",
  "conversationId": "conversation-uuid",
  "customerInfo": { ... }
}
```

### Send Message
```
POST /api/customer-chat/send-message
Content-Type: application/json

{
  "conversationId": "conversation-uuid",
  "content": "Message text",
  "customerId": "customer-uuid"
}
```

### Fetch Messages
```
GET /api/customer-chat/messages/{conversationId}

Response:
[
  {
    "id": "message-uuid",
    "content": "Message text",
    "senderType": "customer" | "agent",
    "senderName": "Name",
    "timestamp": "2025-12-14T03:00:00.000Z"
  }
]
```

### Check Existing Session
```
GET /api/customer-chat/check-session/{sessionId}

Response (if exists):
{
  "conversationId": "conversation-uuid",
  "customerId": "customer-uuid",
  "customerInfo": { ... }
}
```

## Error Handling

- WebSocket may disconnect due to network issues
- Implement heartbeat/ping mechanism if needed
- Fall back to REST API polling if WebSocket fails consistently
- Display appropriate offline/reconnecting states to users

## Security Considerations

- Never expose WebSocket credentials in logs
- Validate `customerId` and `sessionId` match on server
- Use secure WebSocket (wss://) in production
- Implement rate limiting on message sending
