import { apiRequest } from './queryClient';
import type {
  User,
  Customer,
  InsertCustomer,
  Conversation,
  Message
} from '@shared/schema';

export interface DashboardStats {
  conversations: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
  };
  customers: {
    total: number;
    online: number;
  };
  agents: {
    total: number;
    online: number;
  };
}

export const authApi = {
  me: (): Promise<User> =>
    apiRequest('/api/auth/me', 'GET'),

  login: (email: string, password: string): Promise<{ user: User; message: string }> =>
    apiRequest('/api/auth/login', 'POST', { email, password }),

  logout: (): Promise<{ message: string }> =>
    apiRequest('/api/auth/logout', 'POST'),
};

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    apiRequest('/api/dashboard/stats', 'GET'),
};

export const customersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ customers: Customer[]; total: number; page: number; totalPages: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    const qs = queryParams.toString();
    return apiRequest(`/api/customers${qs ? `?${qs}` : ''}`, 'GET');
  },

  create: (customer: InsertCustomer): Promise<Customer> =>
    apiRequest('/api/customers', 'POST', customer),

  getById: (id: string): Promise<Customer> =>
    apiRequest(`/api/customers/${id}`, 'GET'),

  updateStatus: (id: string, status: string): Promise<{ message: string }> =>
    apiRequest(`/api/customers/${id}/status`, 'PATCH', { status }),
};

export const conversationsApi = {
  getAll: (): Promise<Conversation[]> =>
    apiRequest('/api/conversations', 'GET'),

  getById: (id: string): Promise<Conversation> =>
    apiRequest(`/api/conversations/${id}`, 'GET'),

  getMessages: (conversationId: string): Promise<Message[]> =>
    apiRequest(`/api/conversations/${conversationId}/messages`, 'GET'),

  create: (conversation: {
    customerId: string;
    title: string;
    priority?: string;
    status?: string;
  }): Promise<Conversation> =>
    apiRequest('/api/conversations', 'POST', conversation),

  updateStatus: (id: string, status: string): Promise<{ message: string }> =>
    apiRequest(`/api/conversations/${id}/status`, 'PATCH', { status }),

  assign: (id: string, agentId: string): Promise<{ message: string }> =>
    apiRequest(`/api/conversations/${id}/assign`, 'PATCH', { agentId }),
};

export const messagesApi = {
  create: (message: { conversationId: string; content: string }): Promise<Message> =>
    apiRequest('/api/messages', 'POST', message),

  updateStatus: (id: string, status: string): Promise<{ message: string }> =>
    apiRequest(`/api/messages/${id}/status`, 'PATCH', { status }),
};

export const usersApi = {
  getAll: (): Promise<User[]> =>
    apiRequest('/api/users', 'GET'),
};
