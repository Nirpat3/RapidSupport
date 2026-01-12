import { storage } from "../storage";
import type { AiResourceScope } from "@shared/schema";

export interface DataConnectorConfig {
  type: 'azure_sql' | 'azure_cosmos' | 'aws_rds' | 'aws_dynamodb' | 'postgresql' | 'internal';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  region?: string;
  tableName?: string;
  collection?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface QueryContext {
  organizationId: string;
  workspaceId?: string;
  departmentId?: string;
  userId?: string;
  customerId?: string;
  parameters?: Record<string, unknown>;
}

export interface QueryResult {
  success: boolean;
  data?: unknown[];
  error?: string;
  rowCount?: number;
  executionTimeMs?: number;
}

export abstract class DataConnector {
  protected config: DataConnectorConfig;
  protected resourceScope: AiResourceScope;

  constructor(config: DataConnectorConfig, resourceScope: AiResourceScope) {
    this.config = config;
    this.resourceScope = resourceScope;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string, context: QueryContext): Promise<QueryResult>;
  abstract testConnection(): Promise<boolean>;

  protected applyRowLevelFilters(query: string, context: QueryContext): string {
    const filters = this.resourceScope.rowLevelFilters as Record<string, string> | null;
    if (!filters) return query;

    let filteredQuery = query;
    
    Object.entries(filters).forEach(([field, template]) => {
      const value = template
        .replace('{{org_id}}', context.organizationId || '')
        .replace('{{workspace_id}}', context.workspaceId || '')
        .replace('{{department_id}}', context.departmentId || '')
        .replace('{{user_id}}', context.userId || '')
        .replace('{{customer_id}}', context.customerId || '');

      filteredQuery = filteredQuery.replace(`{{${field}}}`, `'${value}'`);
    });

    return filteredQuery;
  }

  protected sanitizeQuery(query: string): string {
    return query.replace(/[^\w\s.,=<>!?'"\-():@{}]/g, '');
  }
}

export class AzureSQLConnector extends DataConnector {
  private pool: unknown | null = null;

  async connect(): Promise<void> {
    console.log('[AzureSQLConnector] Connecting to Azure SQL Database...');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      console.log('[AzureSQLConnector] Disconnecting from Azure SQL Database...');
      this.pool = null;
    }
  }

  async executeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const filteredQuery = this.applyRowLevelFilters(query, context);
      
      console.log('[AzureSQLConnector] Would execute query:', filteredQuery);
      
      return {
        success: true,
        data: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[AzureSQLConnector] Testing connection to Azure SQL...');
      return true;
    } catch (error) {
      console.error('[AzureSQLConnector] Connection test failed:', error);
      return false;
    }
  }
}

export class AzureCosmosConnector extends DataConnector {
  private client: unknown | null = null;

  async connect(): Promise<void> {
    console.log('[AzureCosmosConnector] Connecting to Azure Cosmos DB...');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('[AzureCosmosConnector] Disconnecting from Azure Cosmos DB...');
      this.client = null;
    }
  }

  async executeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const filteredQuery = this.applyRowLevelFilters(query, context);
      
      console.log('[AzureCosmosConnector] Would execute query:', filteredQuery);
      
      return {
        success: true,
        data: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[AzureCosmosConnector] Testing connection to Cosmos DB...');
      return true;
    } catch (error) {
      console.error('[AzureCosmosConnector] Connection test failed:', error);
      return false;
    }
  }
}

export class AWSRDSConnector extends DataConnector {
  private pool: unknown | null = null;

  async connect(): Promise<void> {
    console.log('[AWSRDSConnector] Connecting to AWS RDS...');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      console.log('[AWSRDSConnector] Disconnecting from AWS RDS...');
      this.pool = null;
    }
  }

  async executeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const filteredQuery = this.applyRowLevelFilters(query, context);
      
      console.log('[AWSRDSConnector] Would execute query:', filteredQuery);
      
      return {
        success: true,
        data: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[AWSRDSConnector] Testing connection to AWS RDS...');
      return true;
    } catch (error) {
      console.error('[AWSRDSConnector] Connection test failed:', error);
      return false;
    }
  }
}

export class AWSDynamoDBConnector extends DataConnector {
  private client: unknown | null = null;

  async connect(): Promise<void> {
    console.log('[AWSDynamoDBConnector] Connecting to AWS DynamoDB...');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('[AWSDynamoDBConnector] Disconnecting from AWS DynamoDB...');
      this.client = null;
    }
  }

  async executeQuery(query: string, context: QueryContext): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const filteredQuery = this.applyRowLevelFilters(query, context);
      
      console.log('[AWSDynamoDBConnector] Would execute PartiQL query:', filteredQuery);
      
      return {
        success: true,
        data: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[AWSDynamoDBConnector] Testing connection to DynamoDB...');
      return true;
    } catch (error) {
      console.error('[AWSDynamoDBConnector] Connection test failed:', error);
      return false;
    }
  }
}

export class DataConnectorFactory {
  private static connectors = new Map<string, DataConnector>();

  static async getConnector(
    resourceScope: AiResourceScope,
    secretResolver?: (key: string) => Promise<string | undefined>
  ): Promise<DataConnector> {
    const cacheKey = `${resourceScope.id}:${resourceScope.dataSourceType}`;
    
    if (this.connectors.has(cacheKey)) {
      return this.connectors.get(cacheKey)!;
    }

    let connectionString: string | undefined;
    if (resourceScope.connectionSecretKey && secretResolver) {
      connectionString = await secretResolver(resourceScope.connectionSecretKey);
    }

    const config: DataConnectorConfig = {
      type: resourceScope.dataSourceType as DataConnectorConfig['type'],
      connectionString,
      tableName: resourceScope.tableOrCollection || undefined,
      collection: resourceScope.tableOrCollection || undefined,
    };

    let connector: DataConnector;

    switch (resourceScope.dataSourceType) {
      case 'azure_sql':
        connector = new AzureSQLConnector(config, resourceScope);
        break;
      case 'azure_cosmos':
        connector = new AzureCosmosConnector(config, resourceScope);
        break;
      case 'aws_rds':
        connector = new AWSRDSConnector(config, resourceScope);
        break;
      case 'aws_dynamodb':
        connector = new AWSDynamoDBConnector(config, resourceScope);
        break;
      default:
        throw new Error(`Unsupported data source type: ${resourceScope.dataSourceType}`);
    }

    await connector.connect();
    this.connectors.set(cacheKey, connector);
    
    return connector;
  }

  static async closeAll(): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.disconnect();
    }
    this.connectors.clear();
  }
}

export class DataBroker {
  private static instance: DataBroker;

  static getInstance(): DataBroker {
    if (!DataBroker.instance) {
      DataBroker.instance = new DataBroker();
    }
    return DataBroker.instance;
  }

  async queryResource(
    organizationId: string,
    resource: string,
    context: QueryContext,
    customQuery?: string
  ): Promise<QueryResult> {
    try {
      const resourceScope = await storage.getAiResourceScopeByResource(organizationId, resource);
      
      if (!resourceScope) {
        return {
          success: false,
          error: `No data source configured for resource: ${resource}`,
        };
      }

      if (!resourceScope.isActive) {
        return {
          success: false,
          error: `Data source for resource ${resource} is currently disabled`,
        };
      }

      if (resourceScope.dataSourceType === 'internal') {
        return await this.queryInternalResource(resource, context);
      }

      const connector = await DataConnectorFactory.getConnector(
        resourceScope,
        async (key) => process.env[key]
      );

      const query = customQuery || resourceScope.queryTemplate || '';
      
      if (!query) {
        return {
          success: false,
          error: 'No query template configured for this resource',
        };
      }

      return await connector.executeQuery(query, context);
    } catch (error) {
      console.error('[DataBroker] Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async queryInternalResource(
    resource: string,
    context: QueryContext
  ): Promise<QueryResult> {
    console.log(`[DataBroker] Querying internal resource: ${resource}`);
    
    return {
      success: true,
      data: [],
      rowCount: 0,
      executionTimeMs: 0,
    };
  }
}

export const dataBroker = DataBroker.getInstance();
