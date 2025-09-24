# cURL Examples for Support Board API

This document provides cURL command examples for integrating with Support Board's external API.

## Authentication

All requests require an API key. Replace `YOUR_API_KEY` with your actual API key.

```bash
export API_KEY="YOUR_API_KEY"
export BASE_URL="https://your-support-board-domain.com"
```

## Customer Operations

### Get All Customers

```bash
curl -X GET "$BASE_URL/api/external/customers" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Customer by ID

```bash
curl -X GET "$BASE_URL/api/external/customers/customer-uuid-here" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Sync Customer from External System

```bash
curl -X POST "$BASE_URL/api/external/customers/sync" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "company": "Tech Solutions Inc",
    "tags": ["premium", "support-priority"],
    "externalId": "ext_customer_12345",
    "externalSystem": "zendesk"
  }'
```

### Update Customer Sync Status

```bash
curl -X PUT "$BASE_URL/api/external/customers/customer-uuid-here/sync-status" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "synced",
    "externalId": "ext_customer_12345"
  }'
```

## Ticket Operations

### Get All Tickets

```bash
curl -X GET "$BASE_URL/api/external/tickets" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Get Ticket by ID

```bash
curl -X GET "$BASE_URL/api/external/tickets/ticket-uuid-here" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
```

### Sync Ticket from External System

```bash
curl -X POST "$BASE_URL/api/external/tickets/sync" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Email Configuration Problem",
    "description": "Customer cannot receive emails from our platform. SMTP settings appear to be correct but emails are not being delivered.",
    "status": "open",
    "priority": "high",
    "category": "Technical Support",
    "customerId": "customer-uuid-here",
    "externalId": "jira_ticket_TSP-4567",
    "externalSystem": "jira"
  }'
```

### Update Ticket Status

```bash
curl -X PUT "$BASE_URL/api/external/tickets/ticket-uuid-here/status" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress"
  }'
```

### Assign Ticket to Agent

```bash
curl -X PUT "$BASE_URL/api/external/tickets/ticket-uuid-here/assign" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-uuid-here"
  }'
```

### Update Ticket Sync Status

```bash
curl -X PUT "$BASE_URL/api/external/tickets/ticket-uuid-here/sync-status" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "synced",
    "externalId": "jira_ticket_TSP-4567"
  }'
```

## Webhooks

### Send Webhook to Support Board

```bash
curl -X POST "$BASE_URL/api/external/webhook" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ticket.created",
    "type": "ticket",
    "id": "external_ticket_id_9999",
    "data": {
      "title": "New Critical Issue",
      "description": "Production system experiencing downtime",
      "status": "open",
      "priority": "urgent",
      "category": "Critical Infrastructure",
      "customerId": "customer-uuid-here",
      "externalId": "external_ticket_id_9999",
      "externalSystem": "monitoring_system"
    }
  }'
```

## Batch Operations

### Sync Multiple Customers

```bash
#!/bin/bash

# Array of customer data
customers=(
  '{"name":"Customer One","email":"c1@example.com","company":"Company A","externalId":"ext_1","externalSystem":"crm"}'
  '{"name":"Customer Two","email":"c2@example.com","company":"Company B","externalId":"ext_2","externalSystem":"crm"}'
  '{"name":"Customer Three","email":"c3@example.com","company":"Company C","externalId":"ext_3","externalSystem":"crm"}'
)

for customer in "${customers[@]}"; do
  echo "Syncing customer: $customer"
  curl -X POST "$BASE_URL/api/external/customers/sync" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$customer"
  echo ""
  sleep 1  # Rate limiting consideration
done
```

### Bulk Ticket Status Update

```bash
#!/bin/bash

# Array of ticket IDs to close
ticket_ids=(
  "ticket-uuid-1"
  "ticket-uuid-2"
  "ticket-uuid-3"
)

for ticket_id in "${ticket_ids[@]}"; do
  echo "Closing ticket: $ticket_id"
  curl -X PUT "$BASE_URL/api/external/tickets/$ticket_id/status" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "closed"}'
  echo ""
  sleep 0.5  # Rate limiting consideration
done
```

## Error Handling in Shell Scripts

```bash
#!/bin/bash

sync_customer() {
  local customer_data="$1"
  local response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/external/customers/sync" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$customer_data")
  
  local http_code="${response: -3}"
  local body="${response%???}"
  
  if [ "$http_code" -eq 201 ]; then
    echo "Success: Customer synced"
    echo "$body" | jq .
  elif [ "$http_code" -eq 429 ]; then
    echo "Rate limited. Waiting 60 seconds..."
    sleep 60
    sync_customer "$customer_data"  # Retry
  else
    echo "Error $http_code: $body"
    return 1
  fi
}

# Usage
customer_json='{"name":"Test Customer","email":"test@example.com","externalId":"test_123","externalSystem":"test"}'
sync_customer "$customer_json"
```

## Testing API Health

```bash
#!/bin/bash

test_api_health() {
  echo "Testing API connectivity..."
  
  # Test with a simple GET request
  response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/api/external/customers" \
    -H "X-API-Key: $API_KEY")
  
  http_code="${response: -3}"
  
  if [ "$http_code" -eq 200 ]; then
    echo "✅ API is accessible and authentication is working"
  elif [ "$http_code" -eq 401 ]; then
    echo "❌ Authentication failed. Check your API key"
  elif [ "$http_code" -eq 429 ]; then
    echo "⚠️ Rate limited. Too many requests"
  else
    echo "❌ API test failed with HTTP $http_code"
  fi
}

test_api_health
```

## Rate Limiting Handling

```bash
#!/bin/bash

make_api_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local max_retries=3
  local retry_count=0
  
  while [ $retry_count -lt $max_retries ]; do
    if [ -n "$data" ]; then
      response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$data")
    else
      response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -eq 429 ]; then
      retry_count=$((retry_count + 1))
      wait_time=$((retry_count * 30))
      echo "Rate limited. Waiting $wait_time seconds... (Attempt $retry_count/$max_retries)"
      sleep $wait_time
    else
      echo "$body"
      return $http_code
    fi
  done
  
  echo "Max retries exceeded"
  return 1
}

# Usage
make_api_request "GET" "/api/external/customers"
```