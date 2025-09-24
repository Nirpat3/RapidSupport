// Shared ticket storage for demonstration purposes
// In a real app, this would be handled by proper API calls and state management

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  resolvedAt?: Date;
  category: string;
  customerId: string;
  conversationId?: string;
}

// Global ticket store (in real app, this would be in context/redux/zustand)
const ticketStore: Ticket[] = [
  {
    id: 'T-001',
    title: 'Login Issues',
    description: 'Cannot access account after password reset',
    status: 'closed',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    category: 'Authentication',
    customerId: '1'
  },
  {
    id: 'T-002',
    title: 'Feature Request',
    description: 'Request for dark mode in mobile app',
    status: 'open',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    category: 'Enhancement',
    customerId: '1'
  }
];

export const ticketApi = {
  getTicketsByCustomer: (customerId: string): Ticket[] => {
    return ticketStore.filter(ticket => ticket.customerId === customerId);
  },

  createTicket: (ticketData: Omit<Ticket, 'id' | 'createdAt'>): Ticket => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `T-${Date.now().toString().slice(-6)}`,
      createdAt: new Date(),
    };
    ticketStore.push(newTicket);
    return newTicket;
  },

  updateTicketStatus: (ticketId: string, status: Ticket['status']): boolean => {
    const ticketIndex = ticketStore.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) {
      ticketStore[ticketIndex] = {
        ...ticketStore[ticketIndex],
        status,
        ...(status === 'closed' && { resolvedAt: new Date() })
      };
      return true;
    }
    return false;
  },

  getAllTickets: (): Ticket[] => {
    return [...ticketStore];
  }
};