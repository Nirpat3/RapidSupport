# Python Integration for Support Board API

This example demonstrates how to integrate with Support Board using Python.

## Installation

```bash
pip install requests
```

## Basic Python SDK

```python
import requests
import time
import json
from typing import Dict, List, Optional, Any

class SupportBoardAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP {response.status_code}: {response.text}"
            raise Exception(error_msg) from e
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}") from e
    
    # Customer Operations
    def get_all_customers(self) -> Dict:
        """Get all customers"""
        return self._make_request('GET', '/api/external/customers')
    
    def get_customer(self, customer_id: str) -> Dict:
        """Get customer by ID"""
        return self._make_request('GET', f'/api/external/customers/{customer_id}')
    
    def sync_customer(self, customer_data: Dict) -> Dict:
        """Sync customer from external system"""
        return self._make_request('POST', '/api/external/customers/sync', customer_data)
    
    def update_customer_sync_status(self, customer_id: str, status: str, external_id: Optional[str] = None) -> Dict:
        """Update customer sync status"""
        data = {'status': status}
        if external_id:
            data['externalId'] = external_id
        return self._make_request('PUT', f'/api/external/customers/{customer_id}/sync-status', data)
    
    # Ticket Operations
    def get_all_tickets(self) -> Dict:
        """Get all tickets"""
        return self._make_request('GET', '/api/external/tickets')
    
    def get_ticket(self, ticket_id: str) -> Dict:
        """Get ticket by ID"""
        return self._make_request('GET', f'/api/external/tickets/{ticket_id}')
    
    def sync_ticket(self, ticket_data: Dict) -> Dict:
        """Sync ticket from external system"""
        return self._make_request('POST', '/api/external/tickets/sync', ticket_data)
    
    def update_ticket_status(self, ticket_id: str, status: str) -> Dict:
        """Update ticket status"""
        return self._make_request('PUT', f'/api/external/tickets/{ticket_id}/status', {'status': status})
    
    def assign_ticket(self, ticket_id: str, agent_id: str) -> Dict:
        """Assign ticket to agent"""
        return self._make_request('PUT', f'/api/external/tickets/{ticket_id}/assign', {'agentId': agent_id})
    
    def update_ticket_sync_status(self, ticket_id: str, status: str, external_id: Optional[str] = None) -> Dict:
        """Update ticket sync status"""
        data = {'status': status}
        if external_id:
            data['externalId'] = external_id
        return self._make_request('PUT', f'/api/external/tickets/{ticket_id}/sync-status', data)
    
    # Webhook
    def send_webhook(self, webhook_data: Dict) -> Dict:
        """Send webhook to Support Board"""
        return self._make_request('POST', '/api/external/webhook', webhook_data)
```

## Usage Examples

```python
from support_board_api import SupportBoardAPI

# Initialize the API client
api = SupportBoardAPI('https://your-support-board-domain.com', 'your_api_key')

def main():
    try:
        # Sync a customer from your system
        customer_data = {
            'name': 'Alice Johnson',
            'email': 'alice.johnson@techcorp.com',
            'company': 'TechCorp Solutions',
            'tags': ['enterprise', 'priority'],
            'externalId': 'crm_customer_789',
            'externalSystem': 'salesforce'
        }
        
        synced_customer = api.sync_customer(customer_data)
        print(f"Customer synced: {synced_customer['data']['id']}")
        
        # Sync a ticket from your system
        ticket_data = {
            'title': 'API Integration Issue',
            'description': 'Customer experiencing 429 rate limit errors when calling our API',
            'status': 'open',
            'priority': 'high',
            'category': 'API Support',
            'customerId': synced_customer['data']['id'],
            'externalId': 'jira_API_5678',
            'externalSystem': 'jira'
        }
        
        synced_ticket = api.sync_ticket(ticket_data)
        print(f"Ticket synced: {synced_ticket['data']['id']}")
        
        # Update ticket status
        api.update_ticket_status(synced_ticket['data']['id'], 'in-progress')
        print("Ticket status updated to in-progress")
        
        # Send webhook notification
        webhook_data = {
            'event': 'ticket.updated',
            'type': 'ticket',
            'id': 'jira_API_5678',
            'data': {
                **ticket_data,
                'status': 'resolved'
            }
        }
        
        api.send_webhook(webhook_data)
        print("Webhook sent successfully")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
```

## Advanced Features

### Retry Mechanism with Exponential Backoff

```python
import time
import random
from functools import wraps

def retry_with_backoff(max_retries=3, backoff_factor=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    
                    # Don't retry on client errors (4xx)
                    if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
                        if 400 <= e.response.status_code < 500:
                            raise e
                    
                    # Calculate backoff time with jitter
                    backoff_time = backoff_factor * (2 ** attempt) + random.uniform(0, 1)
                    print(f"Attempt {attempt + 1} failed, retrying in {backoff_time:.2f} seconds...")
                    time.sleep(backoff_time)
            
            return None
        return wrapper
    return decorator

class SupportBoardAPIWithRetry(SupportBoardAPI):
    @retry_with_backoff(max_retries=3, backoff_factor=2)
    def sync_customer_with_retry(self, customer_data: Dict) -> Dict:
        return self.sync_customer(customer_data)
    
    @retry_with_backoff(max_retries=3, backoff_factor=2)
    def sync_ticket_with_retry(self, ticket_data: Dict) -> Dict:
        return self.sync_ticket(ticket_data)
```

### Bulk Operations

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Callable, Any

class BulkOperations:
    def __init__(self, api: SupportBoardAPI, max_workers: int = 5):
        self.api = api
        self.max_workers = max_workers
    
    def bulk_sync_customers(self, customers: List[Dict]) -> List[Dict]:
        """Sync multiple customers concurrently"""
        results = []
        failed = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_customer = {
                executor.submit(self.api.sync_customer, customer): customer 
                for customer in customers
            }
            
            # Collect results
            for future in as_completed(future_to_customer):
                customer = future_to_customer[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    failed.append({'customer': customer, 'error': str(e)})
                    print(f"Failed to sync customer {customer.get('email', 'unknown')}: {e}")
        
        return {
            'successful': results,
            'failed': failed,
            'total': len(customers),
            'success_count': len(results),
            'failure_count': len(failed)
        }
    
    def bulk_update_ticket_status(self, ticket_status_updates: List[Dict]) -> Dict:
        """Update multiple ticket statuses concurrently"""
        results = []
        failed = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_update = {
                executor.submit(self.api.update_ticket_status, update['ticket_id'], update['status']): update
                for update in ticket_status_updates
            }
            
            for future in as_completed(future_to_update):
                update = future_to_update[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    failed.append({'update': update, 'error': str(e)})
                    print(f"Failed to update ticket {update['ticket_id']}: {e}")
        
        return {
            'successful': results,
            'failed': failed,
            'total': len(ticket_status_updates),
            'success_count': len(results),
            'failure_count': len(failed)
        }
```

### Flask Webhook Receiver

```python
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize API client
api = SupportBoardAPI('https://your-support-board-domain.com', 'your_api_key')

@app.route('/webhook/from-external-system', methods=['POST'])
def handle_external_webhook():
    """Handle webhooks from external systems and forward to Support Board"""
    try:
        data = request.get_json()
        event = data.get('event')
        
        if not event:
            return jsonify({'error': 'Missing event type'}), 400
        
        # Process based on event type
        if event in ['customer.created', 'customer.updated']:
            customer_data = data.get('data', {})
            customer_data.update({
                'externalId': customer_data.get('id'),
                'externalSystem': 'external_crm'
            })
            
            result = api.sync_customer(customer_data)
            logging.info(f"Customer synced: {result['data']['id']}")
            
        elif event in ['ticket.created', 'ticket.updated']:
            ticket_data = data.get('data', {})
            ticket_data.update({
                'externalId': ticket_data.get('id'),
                'externalSystem': 'external_ticketing'
            })
            
            result = api.sync_ticket(ticket_data)
            logging.info(f"Ticket synced: {result['data']['id']}")
        
        # Forward webhook to Support Board
        webhook_payload = {
            'event': event,
            'type': 'customer' if 'customer' in event else 'ticket',
            'id': data.get('data', {}).get('id'),
            'data': data.get('data', {})
        }
        
        api.send_webhook(webhook_payload)
        
        return jsonify({'success': True, 'message': 'Webhook processed successfully'})
        
    except Exception as e:
        logging.error(f"Webhook processing error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/sync/customers', methods=['POST'])
def manual_customer_sync():
    """Manual endpoint to trigger customer sync"""
    try:
        customers = request.get_json().get('customers', [])
        
        bulk_ops = BulkOperations(api)
        results = bulk_ops.bulk_sync_customers(customers)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Data Validation and Transformation

```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime

class CustomerData(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    tags: Optional[List[str]] = []
    external_id: str
    external_system: str
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError('Maximum 10 tags allowed')
        return v

class TicketData(BaseModel):
    title: str
    description: str
    status: str = 'open'
    priority: str = 'medium'
    category: str = 'General'
    customer_id: str
    external_id: str
    external_system: str
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['open', 'in-progress', 'closed']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {valid_statuses}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of: {valid_priorities}')
        return v

class ValidatedSupportBoardAPI(SupportBoardAPI):
    def sync_customer_validated(self, customer_data: dict) -> Dict:
        """Sync customer with validation"""
        validated_data = CustomerData(**customer_data)
        return self.sync_customer(validated_data.dict())
    
    def sync_ticket_validated(self, ticket_data: dict) -> Dict:
        """Sync ticket with validation"""
        validated_data = TicketData(**ticket_data)
        return self.sync_ticket(validated_data.dict())
```

### Usage with Validation

```python
# Example with validation
validated_api = ValidatedSupportBoardAPI('https://your-support-board-domain.com', 'your_api_key')

try:
    customer_data = {
        'name': 'Bob Wilson',
        'email': 'bob@company.com',
        'company': 'Wilson Industries',
        'tags': ['premium'],
        'external_id': 'wilson_123',
        'external_system': 'crm'
    }
    
    result = validated_api.sync_customer_validated(customer_data)
    print("Customer synced with validation:", result['data']['id'])
    
except ValueError as e:
    print(f"Validation error: {e}")
except Exception as e:
    print(f"API error: {e}")
```