import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, MessageSquare, Clock, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// TODO: remove mock functionality
const customers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    status: 'online',
    totalConversations: 5,
    lastActivity: new Date(Date.now() - 1000 * 60 * 5),
    satisfaction: 4.8,
    tags: ['premium', 'vip']
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@email.com',
    status: 'away',
    totalConversations: 12,
    lastActivity: new Date(Date.now() - 1000 * 60 * 15),
    satisfaction: 4.9,
    tags: ['enterprise']
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@email.com',
    status: 'offline',
    totalConversations: 3,
    lastActivity: new Date(Date.now() - 1000 * 60 * 120),
    satisfaction: 4.2,
    tags: ['new']
  },
  {
    id: '4',
    name: 'Emma Davis',
    email: 'emma.davis@email.com',
    status: 'busy',
    totalConversations: 8,
    lastActivity: new Date(Date.now() - 1000 * 60 * 30),
    satisfaction: 4.6,
    tags: ['premium']
  }
];

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const tagColors = {
  premium: 'bg-purple-100 text-purple-800',
  vip: 'bg-yellow-100 text-yellow-800',
  enterprise: 'bg-blue-100 text-blue-800',
  new: 'bg-green-100 text-green-800'
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6" data-testid="customers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="customers-title">Customers</h1>
          <p className="text-muted-foreground">Manage and view customer information</p>
        </div>
        <Button data-testid="button-add-customer">
          Add Customer
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+10% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
            <span className="text-xs">★</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7</div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
            <Badge variant="secondary" className="text-xs">VIP</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">12% of total</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Directory</CardTitle>
              <CardDescription>Search and manage customer profiles</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center gap-4 p-4 rounded-lg border hover-elevate" data-testid={`customer-${customer.id}`}>
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${statusColors[customer.status as keyof typeof statusColors]}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate" data-testid={`customer-name-${customer.id}`}>
                      {customer.name}
                    </h3>
                    <div className="flex gap-1">
                      {customer.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className={`text-xs ${tagColors[tag as keyof typeof tagColors]}`}
                          data-testid={`customer-tag-${customer.id}-${tag}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid={`customer-email-${customer.id}`}>
                    {customer.email}
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <MessageSquare className="w-4 h-4" />
                      <span data-testid={`customer-conversations-${customer.id}`}>
                        {customer.totalConversations}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <span>★</span>
                      <span data-testid={`customer-satisfaction-${customer.id}`}>
                        {customer.satisfaction}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`customer-activity-${customer.id}`}>
                      {formatDistanceToNow(customer.lastActivity, { addSuffix: true })}
                    </p>
                  </div>
                  
                  <Button variant="ghost" size="icon" data-testid={`customer-menu-${customer.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}