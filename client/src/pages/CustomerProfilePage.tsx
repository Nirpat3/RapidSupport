import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Building2, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Star,
  HelpCircle,
  Ticket,
  User,
  Play,
  X
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ticketApi } from "@/lib/ticketStore";

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const priorityColors = {
  low: 'border-green-500 text-green-700 bg-green-50',
  medium: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  high: 'border-orange-500 text-orange-700 bg-orange-50',
  urgent: 'border-red-500 text-red-700 bg-red-50'
};

// Using shared ticket store instead of local mock data

const mockFAQs = [
  {
    id: '1',
    question: 'How do I reset my password?',
    answer: 'Go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your inbox.',
    category: 'Authentication',
    helpful: true
  },
  {
    id: '2',
    question: 'What are the premium features?',
    answer: 'Premium features include advanced analytics, priority support, custom integrations, and increased storage limits.',
    category: 'Billing',
    helpful: false
  },
  {
    id: '3',
    question: 'How do I contact support?',
    answer: 'You can contact support through the chat widget, email us at support@company.com, or create a ticket in your dashboard.',
    category: 'General',
    helpful: true
  }
];

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isStartConversationOpen, setIsStartConversationOpen] = useState(false);
  const [newConversation, setNewConversation] = useState({
    subject: "",
    message: "",
    priority: "medium"
  });
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "General"
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Mutation for creating a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { customerId: string; subject: string; initialMessage: string; priority: string }) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: data.customerId,
          title: data.subject,
          status: 'open',
          priority: data.priority,
          initialMessage: data.initialMessage
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create conversation');
      }
      return response.json();
    },
    onSuccess: (conversation) => {
      toast({
        title: "Conversation Started",
        description: "Your message has been sent to the customer.",
      });
      setIsStartConversationOpen(false);
      setNewConversation({ subject: "", message: "", priority: "medium" });
      queryClient.invalidateQueries({ queryKey: ['/api/customers', id, 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      // Navigate to the conversation
      navigate(`/conversations?id=${conversation.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  });
  
  const handleTicketStatusChange = (ticketId: string, newStatus: 'open' | 'in-progress' | 'closed') => {
    const success = ticketApi.updateTicketStatus(ticketId, newStatus);
    if (success) {
      toast({
        title: "Status Updated",
        description: `Ticket ${ticketId} status changed to ${newStatus}`,
      });
      // Force re-render by updating component state
      setActiveTab(activeTab); // Trigger refresh
    } else {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  // Fetch customer details
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['/api/customers', id],
    queryFn: () => customersApi.getById(id!),
    enabled: !!id,
  });

  // Fetch conversations for this customer
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ['/api/customers', id, 'conversations'],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${id}/conversations`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const handleGoBack = () => {
    navigate("/customers");
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleGoBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">Customer not found</p>
          <p className="text-muted-foreground text-sm">The customer you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="customer-profile-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="customer-profile-title">
            Customer Profile
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isStartConversationOpen} onOpenChange={setIsStartConversationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-send-message">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Start Conversation with {customer.name}</DialogTitle>
                <DialogDescription>
                  Send a message to this customer. They will receive it in their customer portal.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="conv-subject">Subject</Label>
                  <Input
                    id="conv-subject"
                    placeholder="What is this conversation about?"
                    value={newConversation.subject}
                    onChange={(e) => setNewConversation({...newConversation, subject: e.target.value})}
                    data-testid="input-conversation-subject"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="conv-message">Message</Label>
                  <Textarea
                    id="conv-message"
                    placeholder="Type your message to the customer..."
                    value={newConversation.message}
                    onChange={(e) => setNewConversation({...newConversation, message: e.target.value})}
                    className="min-h-[120px]"
                    data-testid="textarea-conversation-message"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStartConversationOpen(false)} data-testid="button-cancel-conversation">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!newConversation.subject.trim() || !newConversation.message.trim()) {
                      toast({
                        title: "Error",
                        description: "Please enter both a subject and message.",
                        variant: "destructive",
                      });
                      return;
                    }
                    createConversationMutation.mutate({
                      customerId: customer.id,
                      subject: newConversation.subject,
                      initialMessage: newConversation.message,
                      priority: newConversation.priority
                    });
                  }}
                  disabled={createConversationMutation.isPending}
                  data-testid="button-submit-conversation"
                >
                  {createConversationMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddTicketOpen} onOpenChange={setIsAddTicketOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" data-testid="button-create-ticket">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogDescription>
                  Create a new support ticket for {customer.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ticket-title">Title</Label>
                  <Input
                    id="ticket-title"
                    placeholder="Brief description of the issue"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    data-testid="input-ticket-title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ticket-description">Description</Label>
                  <Textarea
                    id="ticket-description"
                    placeholder="Detailed description of the issue"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    data-testid="textarea-ticket-description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddTicketOpen(false)} data-testid="button-cancel-ticket">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!newTicket.title.trim() || !newTicket.description.trim()) {
                      toast({
                        title: "Error",
                        description: "Please fill in all required fields.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Create new ticket with proper ID and timestamps
                    const ticket = {
                      id: `T-${Date.now().toString().slice(-6)}`,
                      title: newTicket.title,
                      description: newTicket.description,
                      status: 'open' as const,
                      priority: newTicket.priority as 'low' | 'medium' | 'high' | 'urgent',
                      createdAt: new Date(),
                      category: newTicket.category,
                      customerId: customer.id
                    };
                    
                    // Add to shared ticket store
                    ticketApi.createTicket({
                      title: newTicket.title,
                      description: newTicket.description,
                      status: 'open',
                      priority: newTicket.priority as 'low' | 'medium' | 'high' | 'urgent',
                      category: newTicket.category,
                      customerId: customer.id
                    });
                    
                    toast({
                      title: "Success",
                      description: `Ticket created successfully!`,
                    });
                    setIsAddTicketOpen(false);
                    setNewTicket({ title: "", description: "", priority: "medium", category: "General" });
                  }}
                  data-testid="button-submit-ticket"
                >
                  Create Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg">{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background ${statusColors[customer.status as keyof typeof statusColors]}`} />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <h2 className="text-xl font-semibold" data-testid="customer-name">{customer.name}</h2>
                <Badge variant="secondary" className="text-xs">
                  {customer.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span data-testid="customer-email">{customer.email}</span>
                </div>
                {customer.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span data-testid="customer-company">{customer.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Customer since {format(new Date(customer.createdAt), 'MMM yyyy')}</span>
                </div>
              </div>
              
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {customer.tags.map((tag: string, index: number) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs h-5 px-1.5"
                      data-testid={`customer-tag-${index}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations" data-testid="tab-conversations">Conversations</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">Tickets</TabsTrigger>
          <TabsTrigger value="faqs" data-testid="tab-faqs">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-conversations">12</div>
                <p className="text-xs text-muted-foreground">+2 this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <Ticket className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-open-tickets">1</div>
                <p className="text-xs text-muted-foreground">1 pending</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                <Star className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-satisfaction">4.8</div>
                <p className="text-xs text-muted-foreground">Average rating</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-response-time">2.4h</div>
                <p className="text-xs text-muted-foreground">Average</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    action: 'Created new ticket',
                    description: 'Feature Request - Dark mode for mobile app',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
                    icon: <Ticket className="w-4 h-4 text-blue-500" />
                  },
                  {
                    action: 'Conversation resolved',
                    description: 'Billing Question - Premium features explained',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
                    icon: <CheckCircle className="w-4 h-4 text-green-500" />
                  },
                  {
                    action: 'Profile updated',
                    description: 'Added company information and tags',
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
                    icon: <User className="w-4 h-4 text-orange-500" />
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5">{activity.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
              <CardDescription>All conversations with {customer.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {conversationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversations.map((conversation: any) => (
                    <div key={conversation.id} className="border rounded-lg p-4 hover-elevate" data-testid={`conversation-${conversation.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{conversation.title || 'Untitled Conversation'}</h4>
                            <Badge 
                              variant={conversation.status === 'resolved' ? 'default' : conversation.status === 'open' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {conversation.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${priorityColors[conversation.priority as keyof typeof priorityColors]}`}
                            >
                              {conversation.priority}
                            </Badge>
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{conversation.messageCount || 0} messages</span>
                            <span>
                              {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                            </span>
                            {conversation.agentName && (
                              <span>Handled by {conversation.agentName}</span>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          data-testid={`button-view-conversation-${conversation.id}`}
                        >
                          <Link href={`/conversations/${conversation.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>Track and manage customer support requests</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddTicketOpen(true)}
                  data-testid="button-add-ticket"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticketApi.getTicketsByCustomer(customer.id).map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover-elevate" data-testid={`ticket-${ticket.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
                          <h4 className="font-medium">{ticket.title}</h4>
                          <Badge 
                            variant={ticket.status === 'closed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {ticket.status}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Category: {ticket.category}</span>
                          <span>
                            Created {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
                          </span>
                          {ticket.resolvedAt && (
                            <span>
                              Resolved {formatDistanceToNow(ticket.resolvedAt, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'open' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTicketStatusChange(ticket.id, 'in-progress')}
                            data-testid={`button-start-ticket-${ticket.id}`}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {ticket.status === 'in-progress' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTicketStatusChange(ticket.id, 'closed')}
                            data-testid={`button-close-ticket-${ticket.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        )}
                        {ticket.status === 'closed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTicketStatusChange(ticket.id, 'open')}
                            data-testid={`button-reopen-ticket-${ticket.id}`}
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Reopen
                          </Button>
                        )}
                        <Button variant="outline" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Common questions and answers that might help {customer.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFAQs.map((faq) => (
                  <div key={faq.id} className="border rounded-lg p-4" data-testid={`faq-${faq.id}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <h4 className="font-medium">{faq.question}</h4>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {faq.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 pl-6">
                      {faq.answer}
                    </p>
                    <div className="flex items-center justify-between pl-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {faq.helpful ? (
                          <span className="text-green-600">✓ Marked as helpful</span>
                        ) : (
                          <span>Not yet rated</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" data-testid={`button-send-faq-${faq.id}`}>
                        Send to Customer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}