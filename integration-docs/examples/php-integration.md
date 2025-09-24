# PHP Integration for Support Board API

This example demonstrates how to integrate with Support Board using PHP.

## Installation

Install Guzzle HTTP client for easier API interactions:

```bash
composer require guzzlehttp/guzzle
```

## Basic PHP SDK

```php
<?php

require_once 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\ClientException;

class SupportBoardAPI
{
    private $client;
    private $baseUrl;
    private $apiKey;

    public function __construct($baseUrl, $apiKey)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'timeout' => 30
        ]);
    }

    private function makeRequest($method, $endpoint, $data = null)
    {
        try {
            $options = [];
            if ($data !== null) {
                $options['json'] = $data;
            }

            $response = $this->client->request($method, $endpoint, $options);
            return json_decode($response->getBody()->getContents(), true);

        } catch (ClientException $e) {
            $response = $e->getResponse();
            $errorBody = json_decode($response->getBody()->getContents(), true);
            throw new Exception(
                "API Error {$response->getStatusCode()}: " . 
                ($errorBody['error'] ?? 'Unknown error')
            );
        } catch (RequestException $e) {
            throw new Exception("Request failed: " . $e->getMessage());
        }
    }

    // Customer Operations
    public function getAllCustomers()
    {
        return $this->makeRequest('GET', '/api/external/customers');
    }

    public function getCustomer($customerId)
    {
        return $this->makeRequest('GET', "/api/external/customers/{$customerId}");
    }

    public function syncCustomer($customerData)
    {
        return $this->makeRequest('POST', '/api/external/customers/sync', $customerData);
    }

    public function updateCustomerSyncStatus($customerId, $status, $externalId = null)
    {
        $data = ['status' => $status];
        if ($externalId) {
            $data['externalId'] = $externalId;
        }
        return $this->makeRequest('PUT', "/api/external/customers/{$customerId}/sync-status", $data);
    }

    // Ticket Operations
    public function getAllTickets()
    {
        return $this->makeRequest('GET', '/api/external/tickets');
    }

    public function getTicket($ticketId)
    {
        return $this->makeRequest('GET', "/api/external/tickets/{$ticketId}");
    }

    public function syncTicket($ticketData)
    {
        return $this->makeRequest('POST', '/api/external/tickets/sync', $ticketData);
    }

    public function updateTicketStatus($ticketId, $status)
    {
        return $this->makeRequest('PUT', "/api/external/tickets/{$ticketId}/status", ['status' => $status]);
    }

    public function assignTicket($ticketId, $agentId)
    {
        return $this->makeRequest('PUT', "/api/external/tickets/{$ticketId}/assign", ['agentId' => $agentId]);
    }

    public function updateTicketSyncStatus($ticketId, $status, $externalId = null)
    {
        $data = ['status' => $status];
        if ($externalId) {
            $data['externalId'] = $externalId;
        }
        return $this->makeRequest('PUT', "/api/external/tickets/{$ticketId}/sync-status", $data);
    }

    // Webhook
    public function sendWebhook($webhookData)
    {
        return $this->makeRequest('POST', '/api/external/webhook', $webhookData);
    }
}
```

## Usage Examples

```php
<?php

require_once 'SupportBoardAPI.php';

// Initialize the API client
$api = new SupportBoardAPI('https://your-support-board-domain.com', 'your_api_key');

try {
    // Sync a customer from your system
    $customerData = [
        'name' => 'David Chen',
        'email' => 'david.chen@techstartup.com',
        'company' => 'Tech Startup Inc',
        'tags' => ['startup', 'developer'],
        'externalId' => 'wp_user_456',
        'externalSystem' => 'wordpress'
    ];

    $syncedCustomer = $api->syncCustomer($customerData);
    echo "Customer synced: " . $syncedCustomer['data']['id'] . "\n";

    // Sync a ticket from your system
    $ticketData = [
        'title' => 'Plugin Compatibility Issue',
        'description' => 'WordPress plugin causing conflicts with theme functionality',
        'status' => 'open',
        'priority' => 'medium',
        'category' => 'WordPress Support',
        'customerId' => $syncedCustomer['data']['id'],
        'externalId' => 'wp_ticket_7890',
        'externalSystem' => 'wordpress'
    ];

    $syncedTicket = $api->syncTicket($ticketData);
    echo "Ticket synced: " . $syncedTicket['data']['id'] . "\n";

    // Update ticket status
    $api->updateTicketStatus($syncedTicket['data']['id'], 'in-progress');
    echo "Ticket status updated to in-progress\n";

    // Send webhook notification
    $webhookData = [
        'event' => 'ticket.updated',
        'type' => 'ticket',
        'id' => 'wp_ticket_7890',
        'data' => array_merge($ticketData, ['status' => 'resolved'])
    ];

    $api->sendWebhook($webhookData);
    echo "Webhook sent successfully\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
```

## Advanced Features

### Retry Mechanism

```php
<?php

class SupportBoardAPIWithRetry extends SupportBoardAPI
{
    private function retryOperation($operation, $maxRetries = 3, $backoffFactor = 1)
    {
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            try {
                return $operation();
            } catch (Exception $e) {
                $attempt++;
                
                // Don't retry on client errors (4xx)
                if (strpos($e->getMessage(), 'API Error 4') === 0) {
                    throw $e;
                }
                
                if ($attempt >= $maxRetries) {
                    throw $e;
                }
                
                // Calculate backoff time
                $backoffTime = $backoffFactor * pow(2, $attempt - 1) + rand(0, 1000) / 1000;
                echo "Attempt {$attempt} failed, retrying in {$backoffTime} seconds...\n";
                sleep((int)$backoffTime);
            }
        }
    }

    public function syncCustomerWithRetry($customerData)
    {
        return $this->retryOperation(function() use ($customerData) {
            return $this->syncCustomer($customerData);
        });
    }

    public function syncTicketWithRetry($ticketData)
    {
        return $this->retryOperation(function() use ($ticketData) {
            return $this->syncTicket($ticketData);
        });
    }
}
```

### Bulk Operations

```php
<?php

class BulkOperations
{
    private $api;
    private $batchSize;

    public function __construct(SupportBoardAPI $api, $batchSize = 10)
    {
        $this->api = $api;
        $this->batchSize = $batchSize;
    }

    public function bulkSyncCustomers($customers)
    {
        $results = ['successful' => [], 'failed' => []];
        $batches = array_chunk($customers, $this->batchSize);

        foreach ($batches as $batchIndex => $batch) {
            echo "Processing batch " . ($batchIndex + 1) . " of " . count($batches) . "\n";
            
            foreach ($batch as $customer) {
                try {
                    $result = $this->api->syncCustomer($customer);
                    $results['successful'][] = $result;
                } catch (Exception $e) {
                    $results['failed'][] = [
                        'customer' => $customer,
                        'error' => $e->getMessage()
                    ];
                    echo "Failed to sync customer {$customer['email']}: {$e->getMessage()}\n";
                }
                
                // Rate limiting consideration
                usleep(100000); // 100ms delay between requests
            }
        }

        return [
            'successful' => $results['successful'],
            'failed' => $results['failed'],
            'total' => count($customers),
            'success_count' => count($results['successful']),
            'failure_count' => count($results['failed'])
        ];
    }

    public function bulkUpdateTicketStatus($ticketStatusUpdates)
    {
        $results = ['successful' => [], 'failed' => []];

        foreach ($ticketStatusUpdates as $update) {
            try {
                $result = $this->api->updateTicketStatus($update['ticket_id'], $update['status']);
                $results['successful'][] = $result;
            } catch (Exception $e) {
                $results['failed'][] = [
                    'update' => $update,
                    'error' => $e->getMessage()
                ];
                echo "Failed to update ticket {$update['ticket_id']}: {$e->getMessage()}\n";
            }
            
            usleep(100000); // 100ms delay
        }

        return [
            'successful' => $results['successful'],
            'failed' => $results['failed'],
            'total' => count($ticketStatusUpdates),
            'success_count' => count($results['successful']),
            'failure_count' => count($results['failed'])
        ];
    }
}
```

### WordPress Plugin Integration

```php
<?php

/**
 * WordPress Plugin Integration Example
 * Add this to your WordPress plugin
 */

class SupportBoardWPIntegration
{
    private $api;

    public function __construct()
    {
        $this->api = new SupportBoardAPI(
            get_option('support_board_url', ''),
            get_option('support_board_api_key', '')
        );

        // Hook into WordPress events
        add_action('user_register', [$this, 'syncNewCustomer']);
        add_action('wp_insert_post', [$this, 'handleTicketCreation'], 10, 2);
        add_action('rest_api_init', [$this, 'registerWebhookEndpoint']);
    }

    public function syncNewCustomer($userId)
    {
        $user = get_user_by('ID', $userId);
        
        if (!$user) return;

        $customerData = [
            'name' => $user->display_name,
            'email' => $user->user_email,
            'company' => get_user_meta($userId, 'company', true),
            'tags' => ['wordpress', 'new-user'],
            'externalId' => "wp_user_{$userId}",
            'externalSystem' => 'wordpress'
        ];

        try {
            $result = $this->api->syncCustomer($customerData);
            update_user_meta($userId, 'support_board_customer_id', $result['data']['id']);
            error_log("Customer synced to Support Board: {$result['data']['id']}");
        } catch (Exception $e) {
            error_log("Failed to sync customer to Support Board: " . $e->getMessage());
        }
    }

    public function handleTicketCreation($postId, $post)
    {
        // Only handle support ticket post type
        if ($post->post_type !== 'support_ticket') return;

        $customerId = get_user_meta($post->post_author, 'support_board_customer_id', true);
        
        if (!$customerId) {
            // Sync customer first
            $this->syncNewCustomer($post->post_author);
            $customerId = get_user_meta($post->post_author, 'support_board_customer_id', true);
        }

        $ticketData = [
            'title' => $post->post_title,
            'description' => $post->post_content,
            'status' => 'open',
            'priority' => get_post_meta($postId, 'priority', true) ?: 'medium',
            'category' => get_post_meta($postId, 'category', true) ?: 'WordPress',
            'customerId' => $customerId,
            'externalId' => "wp_ticket_{$postId}",
            'externalSystem' => 'wordpress'
        ];

        try {
            $result = $this->api->syncTicket($ticketData);
            update_post_meta($postId, 'support_board_ticket_id', $result['data']['id']);
            error_log("Ticket synced to Support Board: {$result['data']['id']}");
        } catch (Exception $e) {
            error_log("Failed to sync ticket to Support Board: " . $e->getMessage());
        }
    }

    public function registerWebhookEndpoint()
    {
        register_rest_route('support-board/v1', '/webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handleWebhook'],
            'permission_callback' => [$this, 'verifyWebhookAuth']
        ]);
    }

    public function verifyWebhookAuth($request)
    {
        $apiKey = $request->get_header('X-API-Key');
        $expectedKey = get_option('support_board_webhook_key', '');
        
        return $apiKey === $expectedKey;
    }

    public function handleWebhook(WP_REST_Request $request)
    {
        $data = $request->get_json_params();
        
        try {
            error_log("Received Support Board webhook: " . json_encode($data));
            
            // Process webhook data based on event type
            switch ($data['event']) {
                case 'ticket.updated':
                    $this->handleTicketUpdate($data);
                    break;
                case 'customer.updated':
                    $this->handleCustomerUpdate($data);
                    break;
            }
            
            return new WP_REST_Response(['success' => true], 200);
            
        } catch (Exception $e) {
            error_log("Webhook processing error: " . $e->getMessage());
            return new WP_REST_Response(['error' => $e->getMessage()], 500);
        }
    }

    private function handleTicketUpdate($data)
    {
        $externalId = $data['data']['externalId'] ?? '';
        
        if (strpos($externalId, 'wp_ticket_') === 0) {
            $postId = str_replace('wp_ticket_', '', $externalId);
            $status = $data['data']['status'] ?? '';
            
            if ($status) {
                update_post_meta($postId, 'support_board_status', $status);
                error_log("Updated WordPress ticket {$postId} status to {$status}");
            }
        }
    }

    private function handleCustomerUpdate($data)
    {
        $externalId = $data['data']['externalId'] ?? '';
        
        if (strpos($externalId, 'wp_user_') === 0) {
            $userId = str_replace('wp_user_', '', $externalId);
            
            // Update user meta with sync status
            update_user_meta($userId, 'support_board_sync_status', 'synced');
            update_user_meta($userId, 'support_board_last_sync', current_time('mysql'));
        }
    }
}

// Initialize the integration
new SupportBoardWPIntegration();
```

### Laravel Integration Example

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupportBoardService
{
    private $baseUrl;
    private $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('support_board.base_url'), '/');
        $this->apiKey = config('support_board.api_key');
    }

    private function makeRequest($method, $endpoint, $data = null)
    {
        $response = Http::withHeaders([
            'X-API-Key' => $this->apiKey,
            'Content-Type' => 'application/json'
        ])->timeout(30);

        switch (strtoupper($method)) {
            case 'GET':
                $response = $response->get($this->baseUrl . $endpoint);
                break;
            case 'POST':
                $response = $response->post($this->baseUrl . $endpoint, $data);
                break;
            case 'PUT':
                $response = $response->put($this->baseUrl . $endpoint, $data);
                break;
            default:
                throw new \InvalidArgumentException("Unsupported HTTP method: {$method}");
        }

        if (!$response->successful()) {
            Log::error("Support Board API Error", [
                'status' => $response->status(),
                'body' => $response->body(),
                'endpoint' => $endpoint
            ]);
            throw new \Exception("API request failed: " . $response->body());
        }

        return $response->json();
    }

    public function syncCustomer($customerData)
    {
        return $this->makeRequest('POST', '/api/external/customers/sync', $customerData);
    }

    public function syncTicket($ticketData)
    {
        return $this->makeRequest('POST', '/api/external/tickets/sync', $ticketData);
    }

    public function updateTicketStatus($ticketId, $status)
    {
        return $this->makeRequest('PUT', "/api/external/tickets/{$ticketId}/status", ['status' => $status]);
    }
}
```

### Usage in Laravel

```php
<?php

// In a Laravel Controller
namespace App\Http\Controllers;

use App\Services\SupportBoardService;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    private $supportBoard;

    public function __construct(SupportBoardService $supportBoard)
    {
        $this->supportBoard = $supportBoard;
    }

    public function syncCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'company' => 'nullable|string',
            'external_id' => 'required|string'
        ]);

        try {
            $result = $this->supportBoard->syncCustomer([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'company' => $validated['company'],
                'externalId' => $validated['external_id'],
                'externalSystem' => 'laravel_app'
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
```

## Configuration Files

### .env Configuration

```env
SUPPORT_BOARD_URL=https://your-support-board-domain.com
SUPPORT_BOARD_API_KEY=your_api_key_here
SUPPORT_BOARD_WEBHOOK_KEY=your_webhook_secret_key
```

### Configuration Class

```php
<?php

class SupportBoardConfig
{
    public static function getConfig()
    {
        return [
            'base_url' => $_ENV['SUPPORT_BOARD_URL'] ?? '',
            'api_key' => $_ENV['SUPPORT_BOARD_API_KEY'] ?? '',
            'webhook_key' => $_ENV['SUPPORT_BOARD_WEBHOOK_KEY'] ?? '',
            'timeout' => 30,
            'max_retries' => 3,
            'backoff_factor' => 2
        ];
    }
}
```