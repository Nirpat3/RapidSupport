# Support Board - Coding Guidelines & Best Practices

## Table of Contents
1. [Project Philosophy](#project-philosophy)
2. [TypeScript Guidelines](#typescript-guidelines)
3. [Database & Schema Patterns](#database--schema-patterns)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [API Design](#api-design)
7. [Error Handling](#error-handling)
8. [Security Best Practices](#security-best-practices)
9. [Performance Optimization](#performance-optimization)
10. [Testing Guidelines](#testing-guidelines)
11. [Code Review Checklist](#code-review-checklist)

---

## Project Philosophy

### Core Principles

1. **Type Safety First**: Use TypeScript strictly, leverage Zod for runtime validation
2. **DRY (Don't Repeat Yourself)**: Share types between frontend/backend via `shared/schema.ts`
3. **Separation of Concerns**: Routes → Storage → Database (thin controllers, fat models)
4. **Progressive Enhancement**: Start simple, add complexity only when needed
5. **Developer Experience**: Fast feedback loops, clear error messages, good documentation

### Architecture Rules

```
✅ DO: Shared types in shared/schema.ts
✅ DO: Database operations in server/storage.ts
✅ DO: Route handlers in server/routes.ts (business logic can be here for now)
✅ DO: Validation at API boundaries (Zod)
✅ DO: Use storage interface, not direct DB queries in routes

❌ DON'T: Duplicate type definitions
❌ DON'T: Direct database queries in route handlers (use storage)
❌ DON'T: Skip input validation
❌ DON'T: Trust client-side data
❌ DON'T: Expose sensitive data (passwords, etc.)
```

---

## TypeScript Guidelines

### Strict Mode Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Inference

```typescript
// ✅ GOOD: Let TypeScript infer types when obvious
const count = 5; // inferred as number
const name = 'John'; // inferred as string

// ✅ GOOD: Explicit types for function parameters
function getUser(id: string): Promise<User | null> {
  return storage.getUser(id);
}

// ❌ BAD: Unnecessary type annotations
const count: number = 5;
const name: string = 'John';
```

### Shared Types Pattern

```typescript
// shared/schema.ts - Single source of truth
export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('agent')
});

// Drizzle inferred type
export type User = typeof users.$inferSelect;

// Zod schema for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Type for inserts
export type InsertUser = z.infer<typeof insertUserSchema>;

// ✅ Use in backend
import type { User, InsertUser } from '@shared/schema';

// ✅ Use in frontend
import type { User } from '@shared/schema';
```

### Avoid `any` Type

```typescript
// ❌ BAD
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ GOOD
interface DataItem {
  value: string;
}

function processData(data: DataItem[]) {
  return data.map(item => item.value);
}

// ✅ GOOD: Use unknown for truly unknown data
function processUnknown(data: unknown) {
  if (Array.isArray(data)) {
    // TypeScript now knows data is an array
    return data.length;
  }
  return 0;
}
```

### Null Safety

```typescript
// ✅ GOOD: Handle null/undefined explicitly
async function getUserName(id: string): Promise<string> {
  const user = await storage.getUser(id);
  if (!user) {
    throw new Error('User not found');
  }
  return user.name;
}

// ✅ GOOD: Optional chaining
const userName = user?.profile?.name ?? 'Anonymous';

// ❌ BAD: Non-null assertion without check
const userName = user!.profile!.name; // Dangerous!
```

---

## Database & Schema Patterns

### Schema Definition

```typescript
// ✅ GOOD: Complete schema with relations
export const conversations = pgTable('conversations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [conversations.customerId],
    references: [customers.id]
  }),
  messages: many(messages)
}));

// ✅ GOOD: Generate Zod schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateConversationSchema = insertConversationSchema.partial();
```

### Array Columns

```typescript
// ✅ GOOD: Array column syntax
export const customers = pgTable('customers', {
  tags: text('tags').array() // Correct
});

// ❌ BAD: Don't use array() as wrapper
export const customers = pgTable('customers', {
  tags: array(text('tags')) // Wrong!
});
```

### Timestamps

```typescript
// ✅ GOOD: Only add timestamps when necessary
export const messages = pgTable('messages', {
  id: varchar('id').primaryKey(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow()
  // No createdAt/updatedAt - use timestamp instead
});

// ✅ GOOD: Add createdAt/updatedAt for audit trail
export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
```

### Database Migrations

```bash
# ✅ GOOD: Use Drizzle push for schema changes
npm run db:push

# ✅ GOOD: Force push when needed (be careful)
npm run db:push --force

# ❌ BAD: Never write manual SQL migrations
# The project uses push-based migrations, not generate/migrate
```

### ID Column Types - CRITICAL RULE

```typescript
// ⚠️ CRITICAL: NEVER change existing ID column types
// If it's serial, keep it serial. If it's varchar UUID, keep it varchar UUID.

// ✅ GOOD: Check existing schema first
// If database has serial:
id: serial('id').primaryKey()

// If database has varchar UUID:
id: varchar('id').primaryKey().default(sql`gen_random_uuid()`)

// ❌ BAD: Changing from one to another
// Don't change serial -> varchar or varchar -> serial
// This breaks existing data and causes migration failures
```

---

## Backend Development

### Storage Layer Pattern

```typescript
// server/storage.ts - Interface defines contract
interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  // Conversation operations
  getConversation(id: string): Promise<Conversation | null>;
  getConversations(filters: ConversationFilters): Promise<Conversation[]>;
  createConversation(data: InsertConversation): Promise<Conversation>;
}

// Implementation
class DbStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }
  
  // ... other methods
}

export const storage: IStorage = new DbStorage();
```

### Route Handler Pattern

```typescript
// server/routes.ts
import { storage } from './storage';
import { requireAuth, requireRole } from './auth';
import { insertConversationSchema } from '@shared/schema';

// ✅ GOOD: Thin controller, validation, error handling
app.post('/api/conversations', requireAuth, async (req, res) => {
  try {
    // 1. Validate input
    const data = insertConversationSchema.parse(req.body);
    
    // 2. Business logic (or call service)
    const conversation = await storage.createConversation({
      ...data,
      customerId: data.customerId || req.user.id
    });
    
    // 3. Return response
    res.status(201).json(conversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    throw error; // Let error middleware handle
  }
});

// ❌ BAD: Fat controller with direct DB access
app.post('/api/conversations', async (req, res) => {
  const conversation = await db.insert(conversations).values(req.body);
  res.json(conversation);
});
```

### Service Layer (Optional - Not Currently Used)

**Note**: The current codebase places business logic directly in route handlers for simplicity. A service layer can be added when complexity grows.

```typescript
// server/services/conversation-service.ts (Example for future use)
export class ConversationService {
  constructor(private storage: IStorage) {}
  
  async createWithNotification(data: InsertConversation) {
    const conversation = await this.storage.createConversation(data);
    
    // Business logic: notify assigned agent
    if (conversation.assignedAgentId) {
      await this.storage.createNotification({
        userId: conversation.assignedAgentId,
        conversationId: conversation.id,
        type: 'new_assignment'
      });
    }
    
    return conversation;
  }
}
```

**Current Pattern (Used in codebase):**
```typescript
// Business logic in route handlers
app.post('/api/conversations', requireAuth, async (req, res) => {
  const data = insertConversationSchema.parse(req.body);
  const conversation = await storage.createConversation(data);
  
  // Business logic here (not in service layer)
  if (conversation.assignedAgentId) {
    await storage.createNotification({
      userId: conversation.assignedAgentId,
      conversationId: conversation.id
    });
  }
  
  res.status(201).json(conversation);
});
```

### Validation Patterns

```typescript
// ✅ GOOD: Validate at API boundary
const data = insertCustomerSchema.parse(req.body);

// ✅ GOOD: Extend schema for specific validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// ✅ GOOD: Custom validation rules
const updateCustomerSchema = insertCustomerSchema
  .partial()
  .extend({
    email: z.string().email().optional()
  })
  .refine(data => data.name || data.email, {
    message: 'At least one field must be provided'
  });
```

### Async/Await Best Practices

```typescript
// ✅ GOOD: Always await promises
async function getConversationWithMessages(id: string) {
  const conversation = await storage.getConversation(id);
  if (!conversation) return null;
  
  const messages = await storage.getMessages(conversation.id);
  return { ...conversation, messages };
}

// ✅ GOOD: Parallel execution when possible
async function getDashboardData() {
  const [conversations, customers, stats] = await Promise.all([
    storage.getConversations({}),
    storage.getCustomers({}),
    storage.getDashboardStats()
  ]);
  
  return { conversations, customers, stats };
}

// ❌ BAD: Sequential when could be parallel
async function getDashboardData() {
  const conversations = await storage.getConversations({});
  const customers = await storage.getCustomers({});
  const stats = await storage.getDashboardStats();
  return { conversations, customers, stats };
}
```

---

## Frontend Development

### Component Organization

```
components/
├── ui/              # Shadcn/Radix primitives (don't modify)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── AppSidebar.tsx   # App-specific components
├── ChatInterface.tsx
└── ...

pages/
├── ConversationsPage.tsx
├── DashboardPage.tsx
└── ...
```

### React Component Patterns

```typescript
// ✅ GOOD: Functional components with TypeScript
import type { Conversation } from '@shared/schema';

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, onSelect }: ConversationListProps) {
  return (
    <div className="space-y-2">
      {conversations.map(conversation => (
        <Card 
          key={conversation.id} 
          onClick={() => onSelect(conversation.id)}
          data-testid={`card-conversation-${conversation.id}`}
        >
          <CardTitle>{conversation.title}</CardTitle>
        </Card>
      ))}
    </div>
  );
}

// ❌ BAD: No types, inline styles, no testids
export function ConversationList({ conversations, onSelect }) {
  return (
    <div style={{ padding: '10px' }}>
      {conversations.map(conv => (
        <div key={conv.id} onClick={() => onSelect(conv.id)}>
          {conv.title}
        </div>
      ))}
    </div>
  );
}
```

### Data Fetching with TanStack Query

```typescript
// ✅ GOOD: Type-safe query with proper keys
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Conversation } from '@shared/schema';

export function ConversationsPage() {
  // Query
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });
  
  // Mutation
  const createConversation = useMutation({
    mutationFn: (data: InsertConversation) => 
      apiRequest('/api/conversations', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      {conversations?.map(conv => (
        <Card key={conv.id}>{conv.title}</Card>
      ))}
    </div>
  );
}

// ❌ BAD: No types, wrong query structure
const { data } = useQuery(['/api/conversations']);
```

### Form Handling

```typescript
// ✅ GOOD: React Hook Form + Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCustomerSchema } from '@shared/schema';

export function CustomerForm() {
  const form = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: ''
    }
  });
  
  const onSubmit = async (data: InsertCustomer) => {
    await apiRequest('/api/customers', 'POST', data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" data-testid="button-submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### State Management

```typescript
// ✅ GOOD: Context for global auth state
import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const login = async (email: string, password: string) => {
    const user = await apiRequest('/api/auth/login', 'POST', { email, password });
    setUser(user);
  };
  
  const logout = async () => {
    await apiRequest('/api/auth/logout', 'POST');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Test IDs Pattern

```typescript
// ✅ GOOD: Descriptive, unique test IDs
<Button data-testid="button-create-conversation">Create</Button>
<Input data-testid="input-customer-email" />
<Card data-testid={`card-conversation-${conversation.id}`} />

// Test ID naming convention:
// - Interactive: {action}-{target}
//   button-submit, input-email, link-profile
// - Display: {type}-{content}
//   text-username, status-payment
// - Dynamic: {type}-{description}-{id}
//   card-product-123, row-user-456

// ❌ BAD: Generic or no test IDs
<Button>Create</Button>
<Input id="email" />
<Card>{conversation.title}</Card>
```

### Styling Guidelines

```typescript
// ✅ GOOD: Tailwind utilities with dark mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white p-4 rounded-md">
  Content
</div>

// ✅ GOOD: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// ✅ GOOD: Use design system tokens
<Card className="bg-card text-card-foreground border-card-border">
  <Button variant="default">Primary Action</Button>
  <Button variant="outline">Secondary Action</Button>
</Card>

// ❌ BAD: Inline styles, hardcoded colors
<div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
  <button style={{ color: 'blue' }}>Click</button>
</div>
```

---

## API Design

### RESTful Conventions

```typescript
// ✅ GOOD: RESTful resource naming
GET    /api/conversations           # List
GET    /api/conversations/:id       # Get one
POST   /api/conversations           # Create
PUT    /api/conversations/:id       # Update (full)
PATCH  /api/conversations/:id       # Update (partial)
DELETE /api/conversations/:id       # Delete

// ✅ GOOD: Nested resources
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages

// ✅ GOOD: Actions on resources
PUT    /api/conversations/:id/assign
PUT    /api/conversations/:id/status
POST   /api/conversations/:id/close

// ❌ BAD: Non-RESTful, verb-based URLs
POST   /api/assignConversation
GET    /api/getConversationMessages
```

### Response Formats

```typescript
// ✅ GOOD: Consistent success response
res.status(200).json({
  data: conversation,
  message: 'Success' // optional
});

// ✅ GOOD: List with pagination
res.status(200).json({
  data: conversations,
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
});

// ✅ GOOD: Error response
res.status(400).json({
  error: 'Validation failed',
  details: validationErrors
});

// ❌ BAD: Inconsistent formats
res.json({ conversations }); // Sometimes this
res.json(conversations);     // Sometimes this
```

### Query Parameters

```typescript
// ✅ GOOD: Use query params for filtering, pagination, sorting
GET /api/conversations?status=open&page=1&limit=20&sort=-createdAt

app.get('/api/conversations', requireAuth, async (req, res) => {
  const filters = {
    status: req.query.status as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sortBy: req.query.sort as string | undefined
  };
  
  const conversations = await storage.getConversations(filters);
  res.json({ data: conversations });
});
```

### API Versioning

```typescript
// ✅ GOOD: Version critical external APIs
app.use('/api/v1/widget', widgetRoutes);
app.use('/api/v2/widget', widgetRoutesV2);

// ✅ GOOD: Maintain backward compatibility
app.use('/api/widget', widgetRoutes); // Default to latest

// For internal APIs, versioning is optional unless breaking changes
```

---

## Error Handling

### Backend Error Patterns

```typescript
// ✅ GOOD: Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

// ✅ GOOD: Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: err.message,
      details: err.details
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

### Frontend Error Handling

```typescript
// ✅ GOOD: ApiError class for typed errors
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ✅ GOOD: Handle errors in mutations
const createConversation = useMutation({
  mutationFn: (data: InsertConversation) => 
    apiRequest('/api/conversations', 'POST', data),
  onError: (error) => {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        toast({ title: 'Validation Error', description: error.message });
      } else if (error.status === 401) {
        // Redirect to login
        setLocation('/login');
      } else {
        toast({ title: 'Error', description: 'Something went wrong' });
      }
    }
  }
});

// ✅ GOOD: Error boundaries for React errors
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
```

---

## Security Best Practices

### Input Validation

```typescript
// ✅ GOOD: Always validate user input
app.post('/api/customers', requireAuth, async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  const customer = await storage.createCustomer(data);
  res.json(customer);
});

// ✅ GOOD: Validate query parameters
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

// ❌ BAD: Trust user input
const data = req.body;
await db.insert(customers).values(data);
```

### Authentication & Authorization

```typescript
// ✅ GOOD: Check authentication
app.get('/api/conversations', requireAuth, async (req, res) => {
  // req.user is guaranteed to exist
});

// ✅ GOOD: Check authorization (role-based)
app.delete('/api/users/:id', requireRole(['admin']), async (req, res) => {
  await storage.deleteUser(req.params.id);
  res.status(204).send();
});

// ✅ GOOD: Check resource ownership
app.get('/api/customers/:id', requireAuth, async (req, res) => {
  const customer = await storage.getCustomer(req.params.id);
  
  // Agents can only see their assigned customers
  if (req.user.role === 'agent' && customer.assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(customer);
});
```

### SQL Injection Prevention

```typescript
// ✅ GOOD: Use Drizzle ORM (parameterized queries)
await db
  .select()
  .from(users)
  .where(eq(users.email, email));

// ✅ GOOD: When using raw SQL, use parameters
await db.execute(sql`
  SELECT * FROM users 
  WHERE email = ${email}
`);

// ❌ BAD: String concatenation (SQL injection risk)
await db.execute(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Prevention

```typescript
// ✅ GOOD: React automatically escapes content
<div>{userContent}</div>

// ⚠️ CAUTION: Only use dangerouslySetInnerHTML for trusted, sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />

// ✅ GOOD: Sanitize HTML before rendering
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userHTML);
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

### Sensitive Data

```typescript
// ✅ GOOD: Never return passwords
async function getUser(id: string): Promise<User> {
  const user = await db.select().from(users).where(eq(users.id, id));
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// ✅ GOOD: Hash passwords before storing
import { hash } from 'bcryptjs';

const hashedPassword = await hash(password, 10);
await db.insert(users).values({
  email,
  password: hashedPassword
});

// ❌ BAD: Expose sensitive data
res.json(user); // Includes password hash
```

### API Key Security

```typescript
// ✅ GOOD: Validate API key and scope requests
const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const key = await storage.getApiKeyByKey(apiKey);
  if (!key || !key.isActive) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Attach organization context
  req.apiKey = key;
  req.organizationId = key.organizationId;
  next();
};

// ✅ GOOD: Scope queries to organization
app.get('/api/widget/conversations/:customerId', validateApiKey, async (req, res) => {
  const conversations = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.customerId, req.params.customerId),
        eq(conversations.organizationId, req.organizationId) // Multi-tenant scoping
      )
    );
  
  res.json({ data: conversations });
});
```

---

## Performance Optimization

### Database Queries

```typescript
// ✅ GOOD: Select only needed columns
const users = await db
  .select({
    id: users.id,
    name: users.name,
    email: users.email
  })
  .from(users);

// ✅ GOOD: Use joins instead of N+1 queries
const conversationsWithCustomers = await db
  .select()
  .from(conversations)
  .leftJoin(customers, eq(conversations.customerId, customers.id));

// ❌ BAD: N+1 query problem
const conversations = await storage.getConversations({});
for (const conv of conversations) {
  conv.customer = await storage.getCustomer(conv.customerId); // Bad!
}

// ✅ GOOD: Pagination for large datasets
const conversations = await db
  .select()
  .from(conversations)
  .limit(20)
  .offset((page - 1) * 20);

// ✅ GOOD: Indexes on frequently queried columns
// In schema:
export const conversations = pgTable('conversations', {
  customerId: varchar('customer_id').notNull(),
  status: text('status').notNull(),
  // ... other fields
}, (table) => ({
  customerIdx: index('customer_idx').on(table.customerId),
  statusIdx: index('status_idx').on(table.status)
}));
```

### Frontend Optimization

```typescript
// ✅ GOOD: Memoize expensive computations
import { useMemo } from 'react';

function ConversationList({ conversations }: { conversations: Conversation[] }) {
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [conversations]);
  
  return <div>{/* render sorted conversations */}</div>;
}

// ✅ GOOD: Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: any[] }) {
  const parentRef = React.useRef(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map(virtualItem => (
        <div key={virtualItem.key}>
          {items[virtualItem.index].name}
        </div>
      ))}
    </div>
  );
}

// ✅ GOOD: Debounce search input
import { useDebouncedValue } from '@/hooks/use-debounce';

function SearchBar() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  
  const { data } = useQuery({
    queryKey: ['/api/search', debouncedSearch],
    enabled: debouncedSearch.length > 0
  });
}
```

### Caching Strategies

```typescript
// ✅ GOOD: Configure TanStack Query cache
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3
    }
  }
});

// ✅ GOOD: Prefetch data for better UX
const prefetchConversation = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ['/api/conversations', id],
    queryFn: () => fetch(`/api/conversations/${id}`).then(r => r.json())
  });
};

// On hover, prefetch
<Card onMouseEnter={() => prefetchConversation(conversation.id)}>
```

---

## Testing Guidelines

### Unit Testing Backend

```typescript
// tests/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@/server/storage';

describe('Storage', () => {
  beforeEach(async () => {
    // Clean database before each test
    await db.delete(users);
  });
  
  it('should create a user', async () => {
    const user = await storage.createUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'agent'
    });
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
  
  it('should return null for non-existent user', async () => {
    const user = await storage.getUser('non-existent-id');
    expect(user).toBeNull();
  });
});
```

### E2E Testing Frontend

```typescript
// tests/conversations.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Conversations', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'agent@example.com');
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('[data-testid="button-login"]');
  });
  
  test('should create conversation', async ({ page }) => {
    await page.click('[data-testid="button-new-conversation"]');
    await page.fill('[data-testid="input-title"]', 'Test Conversation');
    await page.click('[data-testid="button-create"]');
    
    await expect(page.locator('[data-testid="text-title"]'))
      .toHaveText('Test Conversation');
  });
  
  test('should send message', async ({ page }) => {
    await page.click('[data-testid="card-conversation-123"]');
    await page.fill('[data-testid="input-message"]', 'Hello!');
    await page.click('[data-testid="button-send"]');
    
    await expect(page.locator('[data-testid="message-content"]').last())
      .toHaveText('Hello!');
  });
});
```

### Test Data Builders

```typescript
// tests/builders.ts
export function buildUser(overrides?: Partial<InsertUser>): InsertUser {
  return {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'hashed_password',
    role: 'agent',
    ...overrides
  };
}

export function buildConversation(overrides?: Partial<InsertConversation>): InsertConversation {
  return {
    customerId: 'customer-id',
    status: 'open',
    priority: 'medium',
    ...overrides
  };
}

// Usage in tests
const user = await storage.createUser(buildUser({ role: 'admin' }));
const conversation = await storage.createConversation(
  buildConversation({ customerId: user.id })
);
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] Code follows TypeScript strict mode
- [ ] All types are defined (no `any`)
- [ ] Input validation with Zod schemas
- [ ] Error handling implemented
- [ ] Authentication/authorization checks in place
- [ ] Database queries optimized (no N+1)
- [ ] Test IDs added to interactive elements
- [ ] Responsive design tested
- [ ] Dark mode support verified
- [ ] No sensitive data exposed in responses
- [ ] No console.log statements (use proper logging)
- [ ] Comments explain "why", not "what"
- [ ] Tests written and passing
- [ ] Documentation updated if needed

### Code Review Focus Areas

**Security:**
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication required for protected routes
- [ ] Authorization checks for resource access
- [ ] Sensitive data not exposed
- [ ] API keys validated and scoped properly

**Performance:**
- [ ] Database queries efficient
- [ ] Proper indexes on columns
- [ ] Pagination for large datasets
- [ ] Memoization for expensive computations
- [ ] Debouncing for user input

**Maintainability:**
- [ ] Code is DRY (not duplicated)
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] Complex logic is commented
- [ ] Consistent code style

**Testing:**
- [ ] Critical paths have tests
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] E2E tests for user workflows

---

## Common Pitfalls to Avoid

### 1. ID Column Type Changes
```typescript
// ❌ NEVER DO THIS - Breaking change
// Before:
id: serial('id').primaryKey()
// After:
id: varchar('id').primaryKey().default(sql`gen_random_uuid()`)

// ✅ Keep existing ID type
// Check database first, then match it in schema
```

### 2. Missing Input Validation
```typescript
// ❌ BAD
app.post('/api/customers', async (req, res) => {
  const customer = await storage.createCustomer(req.body);
  res.json(customer);
});

// ✅ GOOD
app.post('/api/customers', async (req, res) => {
  const data = insertCustomerSchema.parse(req.body);
  const customer = await storage.createCustomer(data);
  res.json(customer);
});
```

### 3. N+1 Query Problem
```typescript
// ❌ BAD
const conversations = await storage.getConversations({});
for (const conv of conversations) {
  conv.customer = await storage.getCustomer(conv.customerId);
}

// ✅ GOOD
const conversations = await db
  .select()
  .from(conversations)
  .leftJoin(customers, eq(conversations.customerId, customers.id));
```

### 4. Not Handling Null/Undefined
```typescript
// ❌ BAD
function getUserEmail(id: string) {
  const user = await storage.getUser(id);
  return user.email; // Crash if user is null
}

// ✅ GOOD
function getUserEmail(id: string) {
  const user = await storage.getUser(id);
  if (!user) throw new NotFoundError('User', id);
  return user.email;
}
```

### 5. Exposing Sensitive Data
```typescript
// ❌ BAD
app.get('/api/users/:id', async (req, res) => {
  const user = await storage.getUser(req.params.id);
  res.json(user); // Includes password hash!
});

// ✅ GOOD
app.get('/api/users/:id', async (req, res) => {
  const user = await storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { password, ...safeUser } = user;
  res.json(safeUser);
});
```

---

## Quick Reference

### File Naming Conventions
- Components: PascalCase (`CustomerForm.tsx`)
- Utilities: kebab-case (`api-client.ts`)
- Pages: PascalCase (`ConversationsPage.tsx`)
- Types: PascalCase (`User`, `Conversation`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Import Order
```typescript
// 1. External libraries
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// 3. Shared types
import type { User, Conversation } from '@shared/schema';

// 4. Relative imports
import { helper } from './utils';
```

### Commit Message Format
```
feat: add customer search functionality
fix: resolve websocket connection issue
docs: update API documentation
refactor: simplify conversation service
test: add e2e tests for chat
chore: update dependencies
```

---

**Last Updated**: 2024-01-10
**Version**: 1.0.0
