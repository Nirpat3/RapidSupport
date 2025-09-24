# Node.js SDK for Support Board Integration

This example demonstrates how to integrate with Support Board using Node.js.

## Installation

```bash
npm install axios
```

## Basic Setup

```javascript
const axios = require('axios');

class SupportBoardAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Customer Operations
  async getAllCustomers() {
    try {
      const response = await this.client.get('/api/external/customers');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.response?.data?.error || error.message}`);
    }
  }

  async getCustomer(id) {
    try {
      const response = await this.client.get(`/api/external/customers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch customer: ${error.response?.data?.error || error.message}`);
    }
  }

  async syncCustomer(customerData) {
    try {
      const response = await this.client.post('/api/external/customers/sync', customerData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to sync customer: ${error.response?.data?.error || error.message}`);
    }
  }

  // Ticket Operations
  async getAllTickets() {
    try {
      const response = await this.client.get('/api/external/tickets');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tickets: ${error.response?.data?.error || error.message}`);
    }
  }

  async getTicket(id) {
    try {
      const response = await this.client.get(`/api/external/tickets/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ticket: ${error.response?.data?.error || error.message}`);
    }
  }

  async syncTicket(ticketData) {
    try {
      const response = await this.client.post('/api/external/tickets/sync', ticketData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to sync ticket: ${error.response?.data?.error || error.message}`);
    }
  }

  async updateTicketStatus(ticketId, status) {
    try {
      const response = await this.client.put(`/api/external/tickets/${ticketId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update ticket status: ${error.response?.data?.error || error.message}`);
    }
  }

  async assignTicket(ticketId, agentId) {
    try {
      const response = await this.client.put(`/api/external/tickets/${ticketId}/assign`, { agentId });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to assign ticket: ${error.response?.data?.error || error.message}`);
    }
  }

  // Webhook helper
  async sendWebhook(webhookData) {
    try {
      const response = await this.client.post('/api/external/webhook', webhookData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send webhook: ${error.response?.data?.error || error.message}`);
    }
  }
}

module.exports = SupportBoardAPI;
```

## Usage Examples

```javascript
const SupportBoardAPI = require('./support-board-api');

// Initialize the API client
const api = new SupportBoardAPI('https://your-support-board-domain.com', 'your_api_key');

async function main() {
  try {
    // Sync a customer from your system
    const customerData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corporation',
      tags: ['premium', 'enterprise'],
      externalId: 'customer_12345',
      externalSystem: 'your_crm'
    };

    const syncedCustomer = await api.syncCustomer(customerData);
    console.log('Customer synced:', syncedCustomer);

    // Sync a ticket from your system
    const ticketData = {
      title: 'Login Authentication Issue',
      description: 'Customer unable to authenticate with new password',
      status: 'open',
      priority: 'high',
      category: 'Authentication',
      customerId: syncedCustomer.data.id,
      externalId: 'ticket_98765',
      externalSystem: 'your_ticketing_system'
    };

    const syncedTicket = await api.syncTicket(ticketData);
    console.log('Ticket synced:', syncedTicket);

    // Update ticket status
    await api.updateTicketStatus(syncedTicket.data.id, 'in-progress');
    console.log('Ticket status updated to in-progress');

    // Send webhook notification
    const webhookData = {
      event: 'ticket.updated',
      type: 'ticket',
      id: 'ticket_98765',
      data: {
        ...ticketData,
        status: 'resolved'
      }
    };

    await api.sendWebhook(webhookData);
    console.log('Webhook sent successfully');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Real-time Sync Example

```javascript
const express = require('express');
const SupportBoardAPI = require('./support-board-api');

const app = express();
app.use(express.json());

const api = new SupportBoardAPI('https://your-support-board-domain.com', 'your_api_key');

// Handle incoming webhooks from your system
app.post('/webhook/from-your-system', async (req, res) => {
  try {
    const { event, data } = req.body;

    switch (event) {
      case 'customer.created':
      case 'customer.updated':
        await api.syncCustomer({
          ...data,
          externalId: data.id,
          externalSystem: 'your_system'
        });
        break;

      case 'ticket.created':
      case 'ticket.updated':
        await api.syncTicket({
          ...data,
          externalId: data.id,
          externalSystem: 'your_system'
        });
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

## Error Handling Best Practices

```javascript
class SupportBoardAPIWithRetry extends SupportBoardAPI {
  async retry(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  async syncCustomerWithRetry(customerData) {
    return await this.retry(() => this.syncCustomer(customerData));
  }

  async syncTicketWithRetry(ticketData) {
    return await this.retry(() => this.syncTicket(ticketData));
  }
}
```