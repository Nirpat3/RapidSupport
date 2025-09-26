import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Users, 
  MessageSquare, 
  Clock, 
  MoreVertical, 
  Plus, 
  Building2, 
  Eye, 
  Grid3X3, 
  List, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    company: "",
    tags: [] as string[]
  });
  const [currentTag, setCurrentTag] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    sortBy,
    sortOrder
  };

  // Fetch customers with pagination and filtering
  const { data: customersResponse, isLoading, error } = useQuery({
    queryKey: ['/api/customers', queryParams],
    queryFn: () => customersApi.getAll(queryParams),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const customers = customersResponse?.customers || [];
  const totalPages = customersResponse?.totalPages || 1;
  const total = customersResponse?.total || 0;

  const createCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsAddDialogOpen(false);
      setNewCustomer({ name: "", email: "", company: "", tags: [] });
      setCurrentTag("");
      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addTag = () => {
    if (currentTag.trim() && !newCustomer.tags.includes(currentTag.trim())) {
      setNewCustomer({
        ...newCustomer,
        tags: [...newCustomer.tags, currentTag.trim()]
      });
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewCustomer({
      ...newCustomer,
      tags: newCustomer.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const CustomerCard = ({ customer }: { customer: any }) => (
    <Card key={customer.id} className="hover-elevate transition-all duration-200" data-testid={`customer-card-${customer.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={customer.avatar} alt={customer.name} />
            <AvatarFallback className="text-sm font-semibold">
              {customer.name?.slice(0, 2)?.toUpperCase() || 'UN'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate" data-testid={`customer-name-${customer.id}`}>
                  {customer.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate" data-testid={`customer-email-${customer.id}`}>
                  {customer.email}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${statusColors[customer.status as keyof typeof statusColors] || statusColors.offline}`} />
              </div>
            </div>
            
            {customer.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span className="truncate" data-testid={`customer-company-${customer.id}`}>
                  {customer.company}
                </span>
              </div>
            )}
            
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customer.tags.slice(0, 3).map((tag: string) => (
                  <Badge 
                    key={tag}
                    variant="secondary"
                    className={`text-xs px-2 py-1 ${tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800'}`}
                    data-testid={`customer-tag-${customer.id}-${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
                {customer.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    +{customer.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>12</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(customer.updatedAt || customer.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Link href={`/customers/${customer.id}`}>
                  <Button variant="ghost" size="sm" data-testid={`customer-view-${customer.id}`}>
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`customer-menu-${customer.id}`}>
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CustomerListItem = ({ customer }: { customer: any }) => (
    <div key={customer.id} className="flex items-center gap-4 p-4 border rounded-lg hover-elevate transition-all duration-200" data-testid={`customer-list-${customer.id}`}>
      <Avatar className="w-10 h-10">
        <AvatarImage src={customer.avatar} alt={customer.name} />
        <AvatarFallback className="text-sm">
          {customer.name?.slice(0, 2)?.toUpperCase() || 'UN'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="min-w-0">
          <h3 className="font-medium text-sm truncate">{customer.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
        </div>
        
        <div className="min-w-0">
          {customer.company && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{customer.company}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[customer.status as keyof typeof statusColors] || statusColors.offline}`} />
          <span className="text-xs capitalize">{customer.status || 'offline'}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(customer.updatedAt || customer.createdAt), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-1">
            <Link href={`/customers/${customer.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customer profiles and relationships</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" data-testid="button-add-customer">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile. Name and email are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  data-testid="input-customer-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  data-testid="input-customer-email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  placeholder="Enter company name"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                  data-testid="input-customer-company"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tags (Optional)</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentTag.trim()) {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={!currentTag.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  {newCustomer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newCustomer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag}
                          <span className="text-xs">×</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (newCustomer.name && newCustomer.email) {
                    createCustomerMutation.mutate(newCustomer);
                  }
                }} 
                disabled={createCustomerMutation.isPending || !newCustomer.name || !newCustomer.email}
                data-testid="button-save-customer"
              >
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recently added on top</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Page</CardTitle>
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">View Mode</CardTitle>
            <span className="text-xs">{viewMode === 'grid' ? '⊞' : '≡'}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{viewMode}</div>
            <p className="text-xs text-muted-foreground">{viewMode === 'grid' ? 'Card view' : 'List view'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorted By</CardTitle>
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{sortBy === 'createdAt' ? 'New' : sortBy}</div>
            <p className="text-xs text-muted-foreground">{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle>Customer Directory</CardTitle>
              <CardDescription>
                {searchQuery || statusFilter 
                  ? `Filtered results (${total} matches)`
                  : `All customers (${total} total)`}
              </CardDescription>
            </div>
            
            {/* View and Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort Options */}
              <Select value={sortBy} onValueChange={(value: 'createdAt' | 'updatedAt' | 'name') => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="updatedAt">Updated</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={toggleSort}>
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "list" | "grid")}>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid3X3 className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">Failed to load customers</p>
              <p className="text-muted-foreground text-sm">Please try refreshing the page</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No customers found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter 
                  ? 'Try adjusting your filters to see more results'
                  : 'Get started by adding your first customer'}
              </p>
              {!(searchQuery || statusFilter) && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Customer List/Grid */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {customers.map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {customers.map((customer) => (
                    <CustomerListItem key={customer.id} customer={customer} />
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} customers
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = currentPage <= 3 
                            ? i + 1 
                            : currentPage >= totalPages - 2 
                              ? totalPages - 4 + i 
                              : currentPage - 2 + i;
                          
                          if (page < 1 || page > totalPages) return null;
                          
                          return (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}