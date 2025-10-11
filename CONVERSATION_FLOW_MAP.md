# Customer Chat Conversation Flow Map

## Overview
This document maps out the complete flow of how customer messages are processed and how AI responses are generated.

---

## 1. Customer Sends Message (Frontend)

### Step 1.1: User Action
- Customer types message in input field
- Clicks send button or presses Enter
- **Location**: `client/src/pages/CustomerChatPage.tsx`

### Step 1.2: Send Message Mutation
```typescript
sendMessageMutation.mutate({ 
  content: "Hello, I need help",
  conversationId: chatState.conversationId,
  customerId: chatState.customerId 
})
```

**Calls**: `POST /api/customer-chat/send-message`

---

## 2. Backend Processes Customer Message

### Step 2.1: API Endpoint Receives Request
- **Location**: `server/routes.ts` - `/api/customer-chat/send-message`
- Validates conversation ID
- Creates message in database with:
  - `id`: Auto-generated UUID
  - `conversationId`: From request
  - `senderId`: Customer ID
  - `senderType`: 'customer'
  - `content`: Message text
  - `timestamp`: Now

### Step 2.2: Returns Message to Frontend
```json
{
  "id": "msg-uuid-123",
  "conversationId": "conv-uuid-456",
  "content": "Hello, I need help"
}
```

---

## 3. Frontend Triggers AI Response

### Step 3.1: onSuccess Handler (sendMessageMutation)
```typescript
onSuccess: (data, variables) => {
  setQuestion("");
  refetchMessages();  // ⚠️ TRIGGER #1 - Fetches all messages
  
  // Trigger AI response using message ID
  if (variables.content && data?.id) {
    triggerAiResponse(data.id, variables.content);  // ⚠️ TRIGGER #2 - Queues AI
  }
}
```

### Step 3.2: AI Response Queue System
```typescript
triggerAiResponse(messageId, content) {
  // Check if already processed
  if (processedMessageIdsRef.current.has(messageId)) {
    return; // Skip duplicate
  }
  
  // Check if already in queue
  if (aiMessageQueueRef.current.some(item => item.messageId === messageId)) {
    return; // Skip duplicate
  }
  
  // Add to queue
  aiMessageQueueRef.current.push({ messageId, content });
  
  // Process queue
  processNextAiResponse();
}
```

### Step 3.3: Process AI Response
```typescript
processNextAiResponse() {
  if (isProcessingQueueRef.current || queue.length === 0) {
    return;
  }
  
  isProcessingQueueRef.current = true;
  const nextItem = aiMessageQueueRef.current.shift();
  
  // Mark as processed
  processedMessageIdsRef.current.add(nextItem.messageId);
  
  // Show typing indicator (2-4 second delay)
  setTimeout(() => {
    aiResponseMutation.mutate(nextItem.content);  // ⚠️ TRIGGER #3 - Calls AI
  }, 2000-4000);
}
```

---

## 4. AI Service Generates Response

### Step 4.1: Smart Response API
- **Endpoint**: `POST /api/ai/smart-response`
- **Location**: `server/routes.ts`

```typescript
{
  conversationId: "conv-uuid-456",
  customerMessage: "Hello, I need help",
  customerId: "cust-123"
}
```

### Step 4.2: AI Service Processing
- **Location**: `server/ai-service.ts` - `generateSmartAgentResponse()`

**Process**:
1. **Intent Classification**: Determine if sales, technical, billing, or general
2. **Agent Selection**: Find best AI agent for the intent
3. **Knowledge Base Search**: Find relevant KB articles
4. **Context Building**: Gather conversation history
5. **Response Generation**: Call OpenAI GPT-4o-mini
6. **Quality Analysis**: Score quality, tone, relevance, completeness
7. **Confidence Check**: Determine if human handoff needed
8. **Save AI Message**: Create message in DB with senderType='ai'
9. **Save Learning Data**: Record in ai_agent_learning table
10. **Return Response**

### Step 4.3: AI Message Saved to Database
```sql
INSERT INTO messages (
  id,
  conversation_id,
  sender_id,
  sender_type,
  content,
  scope,
  timestamp,
  status
) VALUES (
  'ai-msg-uuid-789',
  'conv-uuid-456',
  'agent-id-xyz',
  'ai',  -- ⚠️ Important: senderType is 'ai'
  'I'd be happy to help! What specifically do you need assistance with?',
  'public',
  NOW(),
  'sent'
);
```

---

## 5. Frontend Displays AI Response

### Step 5.1: AI Response Mutation Success
```typescript
onSuccess: (response) => {
  console.log('AI response generated:', response);
  
  refetchMessages();  // ⚠️ TRIGGER #4 - Fetch all messages again
  
  setIsAiResponding(false);
  clearTimeout(aiTypingTimeout);
  
  // Process next in queue
  isProcessingQueueRef.current = false;
  processNextAiResponse();
}
```

### Step 5.2: Messages Query Refetch
- Fetches all messages for conversation
- Filters and displays in UI
- Shows customer messages and AI messages

---

## 6. Potential Duplication Points

### ⚠️ Point A: Multiple refetchMessages() calls
- Called after customer message is sent
- Called after AI response is generated
- Could cause stale data or race conditions

### ⚠️ Point B: WebSocket Broadcast (if enabled)
- **Location**: `server/websocket.ts`
- When AI message is saved, WebSocket might broadcast to all connected clients
- Customer chat page might receive duplicate via both polling and WebSocket

### ⚠️ Point C: Message Query Polling
- `useQuery` with `refetchInterval` might be enabled
- Could fetch messages multiple times

### ⚠️ Point D: React Strict Mode
- In development, React renders components twice
- Effects run twice
- Mutations might be called multiple times

### ⚠️ Point E: Customer Message ID Not Returned
- If `data?.id` is undefined in sendMessageMutation.onSuccess
- triggerAiResponse won't be called with proper ID
- Could cause queue issues

---

## 7. Deduplication Mechanisms

### Current Protection:
1. ✅ **Message ID Tracking**: `processedMessageIdsRef` prevents same message ID from being processed twice
2. ✅ **Queue Deduplication**: Checks if message ID already in queue before adding
3. ✅ **Conversation Reset**: Clears processed IDs when conversation changes
4. ✅ **Processing Lock**: `isProcessingQueueRef` prevents concurrent AI calls

### Missing Protection:
1. ❌ **WebSocket Deduplication**: No check if message already exists before displaying
2. ❌ **Refetch Deduplication**: Multiple refetches might cause UI flicker
3. ❌ **Server-side Deduplication**: No check if AI already responded to a customer message

---

## 8. Debug Checklist

To identify where duplicates are coming from:

### Frontend Checks:
- [ ] Check browser console for "AI message queued" logs (how many times?)
- [ ] Check browser console for "Processing AI response" logs (how many times?)
- [ ] Check if message ID is properly returned from sendMessageMutation
- [ ] Check if React Strict Mode is causing double renders
- [ ] Check if WebSocket is connected and receiving duplicate broadcasts

### Backend Checks:
- [ ] Check server logs for "Smart agent response generated" (how many times?)
- [ ] Query database: `SELECT * FROM messages WHERE sender_type='ai' ORDER BY timestamp DESC LIMIT 20`
- [ ] Check if AI service is being called multiple times for same message
- [ ] Check if WebSocket is broadcasting duplicate messages

### Database Checks:
- [ ] Count AI messages per conversation
- [ ] Check if duplicate AI messages have same timestamp
- [ ] Check if duplicate AI messages have different IDs (truly duplicate) or same ID (display issue)

---

## 9. Recommended Fixes

### Option 1: Server-side Deduplication
Add check in AI service to see if AI already responded to this exact customer message:
```typescript
// Before generating response
const recentMessages = await storage.getMessagesByConversation(conversationId);
const lastCustomerMsg = recentMessages
  .filter(m => m.senderType === 'customer')
  .sort((a, b) => b.timestamp - a.timestamp)[0];
  
const hasAiResponse = recentMessages.some(m => 
  m.senderType === 'ai' && 
  m.timestamp > lastCustomerMsg.timestamp
);

if (hasAiResponse) {
  console.log('AI already responded to this message, skipping');
  return;
}
```

### Option 2: Message ID in AI Learning Table
Store customer message ID in ai_agent_learning table:
```typescript
customerMessageId: varchar("customer_message_id").references(() => messages.id)
```
Then check if AI already processed this specific message ID.

### Option 3: Disable WebSocket for Customer Chat
If customer chat doesn't need real-time updates, disable WebSocket to prevent duplicate broadcasts.

### Option 4: Frontend Message Deduplication
Add Set of displayed message IDs to prevent duplicate rendering:
```typescript
const displayedMessageIds = useRef(new Set());

// In render
const uniqueMessages = messages.filter(msg => {
  if (displayedMessageIds.current.has(msg.id)) return false;
  displayedMessageIds.current.add(msg.id);
  return true;
});
```

---

## 10. Testing Steps

1. **Fresh Start**: Clear all processed message refs, start new conversation
2. **Single Message**: Send one message, count AI responses in UI
3. **Database Check**: Query DB to see how many AI messages exist
4. **Console Logs**: Check all console logs for duplication patterns
5. **Network Tab**: Check how many `/api/ai/smart-response` calls are made
6. **WebSocket**: Check if WebSocket is sending duplicate `new_message` events

---

## Current Status

✅ **Fixed Issues**:
- Message ID-based deduplication implemented
- Queue system prevents concurrent AI calls
- Conversation change resets processed IDs

⚠️ **Potential Issues**:
- Multiple `refetchMessages()` calls might cause race conditions
- WebSocket broadcasts not deduplicated
- No server-side check if AI already responded
- React Strict Mode might cause double triggers

🔍 **Need to Investigate**:
- Are duplicates in database or just UI display?
- Is WebSocket enabled and causing broadcasts?
- Is React Strict Mode enabled?
- What do the console logs show?
