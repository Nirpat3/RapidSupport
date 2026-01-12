# AI Agent Database Integration Guide

This document describes how to connect Nova AI agents with external databases (Microsoft Azure and AWS) for real-time data access with role-based access control (RBAC).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Supported Data Sources](#supported-data-sources)
5. [Setting Up Connections](#setting-up-connections)
6. [RBAC Configuration](#rbac-configuration)
7. [API Endpoints](#api-endpoints)
8. [Query Examples](#query-examples)
9. [Security Considerations](#security-considerations)
10. [Error Handling](#error-handling)

---

## Overview

Nova AI's data integration layer allows AI agents to securely query external databases while enforcing role-based access control. When a user asks a question like "What are today's sales?", the system:

1. **Classifies** the request to identify the required resource (e.g., `pos.sales_daily`)
2. **Evaluates** the user's permissions against the required resource
3. **Allows or denies** access based on RBAC policies
4. **Retrieves** data from the configured external database if allowed
5. **Generates** an AI response using the retrieved data

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Message                                   │
│                    "What are today's sales?"                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Intent Classification                               │
│              Identifies: resource=pos.sales_daily, action=read          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        RBAC Evaluator                                    │
│   1. Load user's roles and permissions                                  │
│   2. Check if user has permission for pos.sales_daily.read              │
│   3. Return ALLOW/DENY decision                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
              ┌─────▼─────┐                   ┌─────▼─────┐
              │  ALLOWED  │                   │  DENIED   │
              └─────┬─────┘                   └─────┬─────┘
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────┐
│        Data Connector               │  │      Denial Response            │
│  1. Get resource scope config       │  │  "I'm sorry, you don't have    │
│  2. Connect to Azure/AWS database   │  │   permission to view sales     │
│  3. Execute parameterized query     │  │   data. Please contact your    │
│  4. Apply row-level security        │  │   manager for access."         │
│  5. Return data                     │  └─────────────────────────────────┘
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI Response Generation                              │
│         Uses retrieved data to generate natural language response        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Service-to-Service Authentication

External database connections use service accounts with OAuth 2.0 client credentials flow or API keys stored securely in environment secrets.

#### Required Secrets

| Secret Key | Description | Data Source |
|------------|-------------|-------------|
| `AZURE_SQL_CONNECTION_STRING` | Azure SQL Database connection string | Azure SQL |
| `AZURE_COSMOS_ENDPOINT` | Azure Cosmos DB endpoint URL | Azure Cosmos |
| `AZURE_COSMOS_KEY` | Azure Cosmos DB primary key | Azure Cosmos |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | AWS RDS/DynamoDB |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | AWS RDS/DynamoDB |
| `AWS_REGION` | AWS region (e.g., us-east-1) | AWS RDS/DynamoDB |

### Storing Secrets

Secrets are stored using Replit's built-in secrets management:

```bash
# Via Replit Secrets tab or environment variables
AZURE_SQL_CONNECTION_STRING="Server=myserver.database.windows.net;Database=mydb;User Id=myuser;Password=mypassword;Encrypt=true"
```

---

## Supported Data Sources

### Microsoft Azure

#### Azure SQL Database

```typescript
const config: DataConnectorConfig = {
  type: 'azure_sql',
  connectionString: process.env.AZURE_SQL_CONNECTION_STRING,
};
```

#### Azure Cosmos DB

```typescript
const config: DataConnectorConfig = {
  type: 'azure_cosmos',
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  // Key stored in AZURE_COSMOS_KEY secret
};
```

### Amazon Web Services

#### AWS RDS (PostgreSQL/MySQL)

```typescript
const config: DataConnectorConfig = {
  type: 'aws_rds',
  host: 'mydb.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mydb',
  // Credentials from AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
};
```

#### AWS DynamoDB

```typescript
const config: DataConnectorConfig = {
  type: 'aws_dynamodb',
  region: process.env.AWS_REGION || 'us-east-1',
  tableName: 'my-table',
};
```

---

## Setting Up Connections

### Step 1: Create a Resource Scope

Define what data resources are available and how to access them.

**API Endpoint**: `POST /api/admin/ai-rbac/resource-scopes`

```json
{
  "organizationId": "org-123",
  "name": "POS Daily Sales",
  "resource": "sales_daily",
  "dataSourceType": "azure_sql",
  "connectionSecretKey": "AZURE_SQL_CONNECTION_STRING",
  "tableOrCollection": "sales_transactions",
  "queryTemplate": "SELECT SUM(amount) as total, COUNT(*) as transactions FROM sales_transactions WHERE organization_id = {{org_id}} AND DATE(created_at) = CURRENT_DATE",
  "rowLevelFilters": {
    "organization_id": "{{org_id}}",
    "workspace_id": "{{workspace_id}}"
  },
  "isActive": true
}
```

### Step 2: Create Permissions

Define what actions can be performed on resources.

**API Endpoint**: `POST /api/admin/ai-rbac/permissions`

```json
{
  "organizationId": "org-123",
  "namespace": "pos",
  "action": "read",
  "resource": "sales_daily",
  "description": "View daily sales totals",
  "sensitivityLevel": 2
}
```

### Step 3: Create Roles

Group permissions into roles.

**API Endpoint**: `POST /api/admin/ai-rbac/roles`

```json
{
  "organizationId": "org-123",
  "name": "Manager",
  "description": "Store manager with access to sales reports",
  "isDefault": false
}
```

### Step 4: Assign Permissions to Roles

**API Endpoint**: `POST /api/admin/ai-rbac/role-permissions`

```json
{
  "roleId": "role-manager-123",
  "permissionId": "perm-sales-daily-read"
}
```

### Step 5: Assign Roles to Users

**API Endpoint**: `POST /api/admin/ai-rbac/user-roles`

```json
{
  "userId": "user-456",
  "roleId": "role-manager-123",
  "scopeType": "workspace",
  "scopeId": "workspace-789"
}
```

---

## RBAC Configuration

### Permission Structure

Permissions follow the format: `namespace.resource.action`

| Namespace | Resources | Actions |
|-----------|-----------|---------|
| `pos` | `sales_daily`, `sales_weekly`, `sales_monthly`, `transactions` | `read`, `export` |
| `inventory` | `stock_levels`, `products`, `suppliers` | `read`, `write` |
| `hr` | `employee_schedule`, `payroll_data`, `employee_info` | `read` |
| `finance` | `financial_reports`, `budgets`, `expenses` | `read`, `approve` |
| `crm` | `customer_data`, `leads`, `opportunities` | `read`, `write` |

### Sensitivity Levels

| Level | Description | Example Resources |
|-------|-------------|-------------------|
| 1 | Low - Public data | Product catalog, store hours |
| 2 | Medium - Internal data | Daily sales, inventory counts |
| 3 | High - Confidential | Customer PII, financial reports |
| 4 | Critical - Restricted | Payroll, SSN, passwords |

### Policy Rules

Create rules to control AI behavior when accessing sensitive resources.

**API Endpoint**: `POST /api/admin/ai-rbac/policy-rules`

```json
{
  "organizationId": "org-123",
  "name": "Sales Data Access Policy",
  "description": "Requires manager role to access sales data",
  "resourcePatterns": ["pos.sales_*", "pos.revenue_*"],
  "requiredPermissions": ["perm-sales-read"],
  "fallbackResponseTemplate": "I'm sorry, you don't have permission to view sales data. Please contact your manager for access.",
  "escalationPolicy": "notify_admin",
  "priority": 10,
  "isActive": true
}
```

---

## API Endpoints

### RBAC Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/ai-rbac/roles` | List all roles |
| `POST` | `/api/admin/ai-rbac/roles` | Create a role |
| `PUT` | `/api/admin/ai-rbac/roles/:id` | Update a role |
| `DELETE` | `/api/admin/ai-rbac/roles/:id` | Delete a role |
| `GET` | `/api/admin/ai-rbac/permissions` | List all permissions |
| `POST` | `/api/admin/ai-rbac/permissions` | Create a permission |
| `GET` | `/api/admin/ai-rbac/user-roles/:userId` | Get user's roles |
| `POST` | `/api/admin/ai-rbac/user-roles` | Assign role to user |

### Resource Scopes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/ai-rbac/resource-scopes` | List resource scopes |
| `POST` | `/api/admin/ai-rbac/resource-scopes` | Create resource scope |
| `PUT` | `/api/admin/ai-rbac/resource-scopes/:id` | Update resource scope |
| `DELETE` | `/api/admin/ai-rbac/resource-scopes/:id` | Delete resource scope |

### Access Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/access-check` | Pre-check access before query |

```json
// Request
{
  "userId": "user-123",
  "resource": "sales_daily",
  "action": "read",
  "namespace": "pos"
}

// Response
{
  "allowed": true,
  "decision": "allowed",
  "reason": "User has required permissions",
  "matchedPermissions": ["perm-sales-read"]
}
```

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/ai-rbac/audit-logs` | View access audit logs |

---

## Query Examples

### Azure SQL - Daily Sales

```sql
-- Query Template (stored in resource scope)
SELECT 
  SUM(amount) as total_sales,
  COUNT(*) as transaction_count,
  AVG(amount) as average_transaction
FROM sales_transactions
WHERE organization_id = {{org_id}}
  AND workspace_id = {{workspace_id}}
  AND DATE(created_at) = CURRENT_DATE
```

### Azure Cosmos DB - Customer Data

```json
{
  "query": "SELECT * FROM c WHERE c.organizationId = @orgId AND c.type = 'customer'",
  "parameters": [
    { "name": "@orgId", "value": "{{org_id}}" }
  ]
}
```

### AWS RDS - Inventory Levels

```sql
SELECT 
  p.name as product_name,
  p.sku,
  i.quantity,
  i.reorder_level,
  CASE WHEN i.quantity <= i.reorder_level THEN 'LOW' ELSE 'OK' END as status
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.workspace_id = {{workspace_id}}
ORDER BY i.quantity ASC
```

### AWS DynamoDB - Transaction History (PartiQL)

```sql
SELECT *
FROM "transactions"
WHERE "pk" = 'ORG#{{org_id}}'
  AND begins_with("sk", 'TXN#')
  AND "createdAt" >= '2024-01-01'
ORDER BY "createdAt" DESC
```

---

## Security Considerations

### 1. Secret Management

- Store all database credentials as Replit Secrets
- Never hardcode connection strings in source code
- Rotate credentials regularly (recommended: every 90 days)

### 2. Connection Security

- Always use TLS/SSL for database connections
- Use private endpoints when available (Azure Private Link, AWS PrivateLink)
- Restrict database firewall rules to known IP ranges

### 3. Query Safety

- All queries use parameterized statements to prevent SQL injection
- User input is never directly concatenated into queries
- Row-level security filters are automatically applied

### 4. Access Control

- Implement least-privilege principle for all roles
- Default to deny - only explicitly granted permissions are allowed
- Regularly audit user role assignments

### 5. Audit Logging

All access decisions are logged with:
- Timestamp
- User/customer ID
- Requested resource
- Decision (allowed/denied)
- Matched permissions
- Query executed (if allowed)
- Response time

---

## Error Handling

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `403_RBAC_DENY` | User lacks required permissions | Assign appropriate role to user |
| `424_DATA_CONNECTOR_ERROR` | Failed to connect to external database | Check connection string and network |
| `429_RATE_LIMIT` | Too many requests | Wait and retry with exponential backoff |
| `500_QUERY_ERROR` | Query execution failed | Check query syntax and table existence |
| `503_SERVICE_UNAVAILABLE` | External database unavailable | Check database status and retry |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "403_RBAC_DENY",
    "message": "Access denied: You don't have permission to access pos.sales_daily",
    "resource": "pos.sales_daily",
    "action": "read",
    "suggestion": "Contact your administrator to request access"
  }
}
```

---

## Node.js Integration Example

```typescript
import { rbacService } from './services/rbac-service';
import { dataBroker } from './services/data-connector';

async function handleAiQuery(
  userId: string,
  organizationId: string,
  message: string
) {
  // 1. Classify the user's intent
  const intent = await rbacService.classifyResourceIntent(message, organizationId);
  
  if (!intent) {
    // Message doesn't require data access
    return await generateRegularResponse(message);
  }

  // 2. Check permissions
  const decision = await rbacService.checkResourceAccess(
    { userId, organizationId },
    { 
      resource: intent.resource, 
      action: intent.action,
      namespace: intent.namespace 
    }
  );

  if (!decision.allowed) {
    return {
      success: false,
      message: decision.fallbackResponse || decision.reason
    };
  }

  // 3. Query the data source
  const result = await dataBroker.queryResource(
    organizationId,
    `${intent.namespace}.${intent.resource}`,
    { organizationId, userId }
  );

  if (!result.success) {
    return {
      success: false,
      message: `Unable to retrieve data: ${result.error}`
    };
  }

  // 4. Generate AI response with data context
  return await generateAiResponse(message, result.data);
}
```

---

## cURL Examples

### Create a Role

```bash
curl -X POST https://your-app.replit.app/api/admin/ai-rbac/roles \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "organizationId": "org-123",
    "name": "Cashier",
    "description": "Point of sale cashier with limited access",
    "isDefault": true
  }'
```

### Create a Permission

```bash
curl -X POST https://your-app.replit.app/api/admin/ai-rbac/permissions \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "organizationId": "org-123",
    "namespace": "pos",
    "action": "read",
    "resource": "transactions_own",
    "description": "View own transactions only",
    "sensitivityLevel": 1
  }'
```

### Check Access

```bash
curl -X POST https://your-app.replit.app/api/ai/access-check \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "userId": "user-456",
    "resource": "sales_daily",
    "action": "read",
    "namespace": "pos"
  }'
```

---

## Best Practices

1. **Start with restrictive permissions** - Add access as needed rather than removing it later
2. **Use descriptive role names** - "Store_Manager_LA" is better than "Role_5"
3. **Document custom permissions** - Keep a changelog of permission changes
4. **Test in development first** - Validate RBAC rules before production deployment
5. **Monitor audit logs** - Set up alerts for repeated access denials
6. **Regular access reviews** - Quarterly review of user role assignments

---

## Support

For integration assistance:
- Open a support ticket through the Nova AI admin portal
- Email: support@nova-ai.example.com
- Documentation: https://docs.nova-ai.example.com
