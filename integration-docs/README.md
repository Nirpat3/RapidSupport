# Support Board External API Integration

Welcome to the Support Board External API documentation. This API allows 3rd party ticket management systems to synchronize customers and tickets with Support Board.

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Customer Sync API](#customer-sync-api)
- [Ticket Sync API](#ticket-sync-api)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [SDKs and Examples](#sdks-and-examples)

## Base URL

```
https://your-support-board-domain.com
```

## Authentication

All external API endpoints require an API key for authentication. Include your API key in one of the following ways:

### Header Authentication (Recommended)
```
X-API-Key: your_api_key_here
```

### Bearer Token
```
Authorization: Bearer your_api_key_here
```

## Rate Limiting

- **Rate Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Response includes rate limit headers
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Window reset time (Unix timestamp)

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {...},
  "message": "Optional message",
  "total": 0
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

## Customer Sync API

### Get All Customers
```http
GET /api/external/customers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "tags": ["vip", "enterprise"],
      "status": "online",
      "externalId": "ext_123",
      "externalSystem": "zendesk",
      "syncStatus": "synced",
      "lastSyncAt": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Customer by ID
```http
GET /api/external/customers/{id}
```

### Sync Customer from External System
```http
POST /api/external/customers/sync
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "tags": ["vip", "enterprise"],
  "externalId": "ext_123",
  "externalSystem": "zendesk"
}
```

### Update Customer Sync Status
```http
PUT /api/external/customers/{id}/sync-status
```

**Request Body:**
```json
{
  "status": "synced",
  "externalId": "ext_123"
}
```

## Ticket Sync API

### Get All Tickets
```http
GET /api/external/tickets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Login Issue",
      "description": "User cannot log in",
      "status": "open",
      "priority": "high",
      "category": "Technical",
      "customerId": "customer_uuid",
      "assignedAgentId": "agent_uuid",
      "conversationId": "conversation_uuid",
      "externalId": "ticket_123",
      "externalSystem": "jira",
      "syncStatus": "synced",
      "lastSyncAt": "2024-01-01T12:00:00Z",
      "resolvedAt": null,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Ticket by ID
```http
GET /api/external/tickets/{id}
```

### Sync Ticket from External System
```http
POST /api/external/tickets/sync
```

**Request Body:**
```json
{
  "title": "Login Issue",
  "description": "User cannot log in to the system",
  "status": "open",
  "priority": "high",
  "category": "Technical",
  "customerId": "customer_uuid",
  "externalId": "ticket_123",
  "externalSystem": "jira"
}
```

### Update Ticket Status
```http
PUT /api/external/tickets/{id}/status
```

**Request Body:**
```json
{
  "status": "in-progress"
}
```

### Assign Ticket to Agent
```http
PUT /api/external/tickets/{id}/assign
```

**Request Body:**
```json
{
  "agentId": "agent_uuid"
}
```

### Update Ticket Sync Status
```http
PUT /api/external/tickets/{id}/sync-status
```

**Request Body:**
```json
{
  "status": "synced",
  "externalId": "ticket_123"
}
```

## Webhooks

Support Board can receive webhooks from external systems to stay synchronized.

### Webhook Endpoint
```http
POST /api/external/webhook
```

**Request Body:**
```json
{
  "event": "ticket.created",
  "type": "ticket",
  "id": "external_id",
  "data": {
    "title": "New Issue",
    "description": "Description here",
    "status": "open",
    "priority": "medium",
    "category": "General",
    "customerId": "customer_uuid",
    "externalId": "ext_ticket_456",
    "externalSystem": "your_system"
  }
}
```

### Supported Events
- `ticket.created` - New ticket created
- `ticket.updated` - Ticket updated
- `customer.created` - New customer created
- `customer.updated` - Customer updated

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Responses

**Validation Error:**
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "Validation error details"
}
```

**Authentication Error:**
```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**Rate Limit Error:**
```json
{
  "success": false,
  "error": "Too many API requests, please try again later."
}
```

## SDKs and Examples

Check the following files for implementation examples:
- [Node.js SDK](./examples/nodejs-sdk.md)
- [Python Integration](./examples/python-integration.md)
- [PHP Integration](./examples/php-integration.md)
- [cURL Examples](./examples/curl-examples.md)