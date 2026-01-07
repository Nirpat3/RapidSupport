import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users,
  UserPlus,
  Search,
  Filter,
  Star,
  TrendingUp,
  MessageSquare,
  Phone,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  DollarSign,
  Target,
  Clock
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Facebook, Instagram } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ChannelBadge } from "@/components/BotControlPanel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  channelType: string;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  leadScore: number;
  businessName?: string;
  businessType?: string;
  notes?: string;
  tags?: string[];
  firstContactAt: string;
  lastContactAt: string;
  messageCount: number;
  customerId?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: "New", color: "text-blue-700", bgColor: "bg-blue-50 dark:bg-blue-950" },
  contacted: { label: "Contacted", color: "text-yellow-700", bgColor: "bg-yellow-50 dark:bg-yellow-950" },
  qualified: { label: "Qualified", color: "text-purple-700", bgColor: "bg-purple-50 dark:bg-purple-950" },
  proposal: { label: "Proposal", color: "text-orange-700", bgColor: "bg-orange-50 dark:bg-orange-950" },
  negotiation: { label: "Negotiation", color: "text-pink-700", bgColor: "bg-pink-50 dark:bg-pink-950" },
  won: { label: "Won", color: "text-green-700", bgColor: "bg-green-50 dark:bg-green-950" },
  lost: { label: "Lost", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800" },
};

export default function LeadTrackingPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/leads/stats'],
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/leads/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Lead Updated",
        description: "Lead information has been saved.",
      });
    },
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || lead.leadStatus === selectedStatus;
    const matchesChannel = selectedChannel === "all" || lead.channelType === selectedChannel;
    
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const leadsByStatus = {
    new: filteredLeads.filter(l => l.leadStatus === 'new').length,
    contacted: filteredLeads.filter(l => l.leadStatus === 'contacted').length,
    qualified: filteredLeads.filter(l => l.leadStatus === 'qualified').length,
    proposal: filteredLeads.filter(l => l.leadStatus === 'proposal').length,
    negotiation: filteredLeads.filter(l => l.leadStatus === 'negotiation').length,
    won: filteredLeads.filter(l => l.leadStatus === 'won').length,
    lost: filteredLeads.filter(l => l.leadStatus === 'lost').length,
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <SiWhatsapp className="w-4 h-4 text-green-500" />;
      case 'facebook':
        return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="lead-tracking-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Lead Tracking</h1>
          <p className="text-muted-foreground">Track and qualify leads from external messaging channels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-blue-500" />
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsByStatus.new}</div>
            <p className="text-sm text-muted-foreground">Awaiting contact</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-purple-500" />
              Qualified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsByStatus.qualified}</div>
            <p className="text-sm text-muted-foreground">Ready for proposals</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leadsByStatus.proposal + leadsByStatus.negotiation}
            </div>
            <p className="text-sm text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
              Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsByStatus.won}</div>
            <p className="text-sm text-muted-foreground">Converted customers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                data-testid="input-search-leads"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-[150px]" data-testid="select-channel-filter">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Leads Found</h3>
              <p className="text-muted-foreground">
                Leads from external channels will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <LeadRow 
                  key={lead.id} 
                  lead={lead}
                  onEdit={() => {
                    setSelectedLead(lead);
                    setIsEditDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLead && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>
                Update lead information and status
              </DialogDescription>
            </DialogHeader>
            <LeadEditForm 
              lead={selectedLead}
              onSave={(data) => updateLead.mutate({ id: selectedLead.id, data })}
              isSaving={updateLead.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LeadRow({ lead, onEdit }: { lead: Lead; onEdit: () => void }) {
  const status = statusConfig[lead.leadStatus] || statusConfig.new;
  
  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg border hover-elevate cursor-pointer"
      onClick={onEdit}
      data-testid={`lead-row-${lead.id}`}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {lead.displayName?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{lead.displayName || 'Unknown'}</span>
          <ChannelBadge channelType={lead.channelType} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          {lead.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />
              {lead.email}
            </span>
          )}
          {lead.businessName && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3" />
              {lead.businessName}
            </span>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <div className="text-center">
          <div className="text-sm font-medium">{lead.messageCount}</div>
          <div className="text-xs text-muted-foreground">messages</div>
        </div>
        
        <div className="w-24">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Score</span>
            <span className="text-xs font-medium">{lead.leadScore}%</span>
          </div>
          <Progress value={lead.leadScore} className="h-1.5" />
        </div>
      </div>

      <Badge variant="outline" className={`${status.bgColor} ${status.color}`}>
        {status.label}
      </Badge>

      <div className="text-sm text-muted-foreground hidden lg:block">
        {formatDistanceToNow(new Date(lead.lastContactAt), { addSuffix: true })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" data-testid={`button-lead-menu-${lead.id}`}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Lead
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className="w-4 h-4 mr-2" />
            View Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function LeadEditForm({ 
  lead, 
  onSave, 
  isSaving 
}: { 
  lead: Lead; 
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    leadStatus: lead.leadStatus,
    leadScore: lead.leadScore,
    businessName: lead.businessName || '',
    businessType: lead.businessType || '',
    notes: lead.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary">
            {lead.displayName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{lead.displayName}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChannelBadge channelType={lead.channelType} />
            {lead.phoneNumber && <span>{lead.phoneNumber}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.leadStatus} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, leadStatus: value as any }))}
          >
            <SelectTrigger data-testid="select-lead-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="score">Lead Score (%)</Label>
          <Input
            id="score"
            type="number"
            min="0"
            max="100"
            value={formData.leadScore}
            onChange={(e) => setFormData(prev => ({ ...prev, leadScore: parseInt(e.target.value) || 0 }))}
            data-testid="input-lead-score"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          value={formData.businessName}
          onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
          placeholder="Company or business name"
          data-testid="input-business-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType">Business Type</Label>
        <Input
          id="businessType"
          value={formData.businessType}
          onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
          placeholder="e.g., E-commerce, SaaS, Retail"
          data-testid="input-business-type"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add notes about this lead..."
          className="min-h-[100px]"
          data-testid="textarea-notes"
        />
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          First contact: {format(new Date(lead.firstContactAt), 'PPP')}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Last message: {formatDistanceToNow(new Date(lead.lastContactAt), { addSuffix: true })}
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Total messages: {lead.messageCount}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSaving} data-testid="button-save-lead">
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}
