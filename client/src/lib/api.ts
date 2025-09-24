// API service functions for backend integration
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

// Authentication API
export const authApi = {
  me: async (): Promise<User> => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    return response.json();
  },

  login: async (email: string, password: string): Promise<{ user: User; message: string }> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    return response.json();
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return response.json();
  }
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await fetch('/api/dashboard/stats', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    return response.json();
  }
};

// Customers API
export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    const response = await fetch('/api/customers', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }
    return response.json();
  },

  create: async (customer: InsertCustomer): Promise<Customer> => {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(customer)
    });
    if (!response.ok) {
      throw new Error('Failed to create customer');
    }
    return response.json();
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await fetch(`/api/customers/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch customer');
    }
    return response.json();
  },

  updateStatus: async (id: string, status: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/customers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      throw new Error('Failed to update customer status');
    }
    return response.json();
  }
};

// Conversations API
export const conversationsApi = {
  getAll: async (): Promise<Conversation[]> => {
    const response = await fetch('/api/conversations', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    return response.json();
  },

  getById: async (id: string): Promise<Conversation> => {
    const response = await fetch(`/api/conversations/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }
    return response.json();
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  },

  create: async (conversation: {
    customerId: string;
    title: string;
    priority?: string;
    status?: string;
  }): Promise<Conversation> => {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(conversation)
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  updateStatus: async (id: string, status: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/conversations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      throw new Error('Failed to update conversation status');
    }
    return response.json();
  },

  assign: async (id: string, agentId: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/conversations/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ agentId })
    });
    if (!response.ok) {
      throw new Error('Failed to assign conversation');
    }
    return response.json();
  }
};

// Messages API
export const messagesApi = {
  create: async (message: {
    conversationId: string;
    content: string;
  }): Promise<Message> => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(message)
    });
    if (!response.ok) {
      throw new Error('Failed to create message');
    }
    return response.json();
  },

  updateStatus: async (id: string, status: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/messages/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      throw new Error('Failed to update message status');
    }
    return response.json();
  }
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await fetch('/api/users', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  }
};