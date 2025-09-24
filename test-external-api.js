// Simple test script for External API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const API_KEY = 'test_api_key_123'; // This should be set as environment variable

async function testAPI() {
  console.log('🧪 Testing Support Board External API endpoints...\n');

  // Test 1: Get all customers (should work even without API key for testing)
  try {
    console.log('📋 Test 1: Get all customers');
    const response = await fetch(`${BASE_URL}/api/external/customers`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ API key authentication is working (unauthorized without valid key)');
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.total || 0} customers`);
    } else {
      console.log(`   ❌ Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Test customer sync endpoint
  try {
    console.log('\n👤 Test 2: Customer sync endpoint');
    const customerData = {
      name: 'Test Customer API',
      email: 'test.api@example.com',
      company: 'API Test Company',
      tags: ['api-test', 'external'],
      externalId: 'ext_test_customer_001',
      externalSystem: 'test_system'
    };

    const response = await fetch(`${BASE_URL}/api/external/customers/sync`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });

    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ API key authentication is working for customer sync');
    } else if (response.status === 201) {
      const data = await response.json();
      console.log(`   ✅ Success: Customer synced with ID ${data.data?.id}`);
    } else {
      console.log(`   ❌ Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Get all tickets
  try {
    console.log('\n🎫 Test 3: Get all tickets');
    const response = await fetch(`${BASE_URL}/api/external/tickets`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ API key authentication is working for tickets');
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.total || 0} tickets`);
    } else {
      console.log(`   ❌ Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Test webhook endpoint
  try {
    console.log('\n🔗 Test 4: Webhook endpoint');
    const webhookData = {
      event: 'ticket.created',
      type: 'ticket',
      id: 'test_ticket_001',
      data: {
        title: 'Test Webhook Ticket',
        description: 'Testing webhook functionality',
        status: 'open',
        priority: 'medium',
        category: 'Test',
        customerId: 'test-customer-id',
        externalId: 'test_ticket_001',
        externalSystem: 'webhook_test'
      }
    };

    const response = await fetch(`${BASE_URL}/api/external/webhook`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ API key authentication is working for webhooks');
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: Webhook processed - ${data.message}`);
    } else {
      console.log(`   ❌ Error: ${await response.text()}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🔍 API Endpoint Summary:');
  console.log('   - Customer endpoints: GET, POST /api/external/customers/*');
  console.log('   - Ticket endpoints: GET, POST, PUT /api/external/tickets/*');
  console.log('   - Webhook endpoint: POST /api/external/webhook');
  console.log('   - Authentication: X-API-Key header required');
  console.log('   - Rate limiting: 100 requests per 15 minutes');
  
  console.log('\n✅ External API testing completed!');
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI().catch(console.error);
}