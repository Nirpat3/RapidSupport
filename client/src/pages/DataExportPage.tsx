import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, RefreshCw, FileArchive, Clock, CheckCircle, XCircle, Calendar, HardDrive, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface DataExportData {
  id: string;
  exportType: string;
  status: string;
  progress: number;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: string;
  includedData: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

const DATA_TYPES = [
  { value: 'conversations', label: 'Conversations', description: 'All conversation history and messages' },
  { value: 'customers', label: 'Customers', description: 'Customer profiles and contact information' },
  { value: 'knowledge_base', label: 'Knowledge Base', description: 'Articles, FAQs, and documentation' },
  { value: 'analytics', label: 'Analytics', description: 'Usage statistics and performance data' },
  { value: 'team', label: 'Team Members', description: 'Staff accounts and roles' },
  { value: 'settings', label: 'Settings', description: 'Organization and workspace settings' },
];

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

export default function DataExportPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    exportType: 'full',
    includedData: ['conversations', 'customers'] as string[],
    dateRange: '30d',
  });

  const { data: exports, isLoading, refetch } = useQuery<DataExportData[]>({
    queryKey: ['/api/admin/data-exports'],
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/admin/data-exports', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-exports'] });
      toast({ title: "Export started", description: "You'll be notified when it's ready" });
      setIsCreateOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to start export", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/data-exports/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-exports'] });
      toast({ title: "Export deleted" });
    },
  });

  const handleDataTypeToggle = (dataType: string) => {
    setFormData(prev => ({
      ...prev,
      includedData: prev.includedData.includes(dataType)
        ? prev.includedData.filter(d => d !== dataType)
        : [...prev.includedData, dataType]
    }));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing': return <RefreshCw className="h-5 w-5 text-primary animate-spin" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'processing': return <Badge variant="secondary">Processing</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Export</h1>
          <p className="text-muted-foreground">Download backups of your organization data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Export
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Data Export</DialogTitle>
                <DialogDescription>Select the data you want to export</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Data to Include</Label>
                  <div className="space-y-2">
                    {DATA_TYPES.map((dataType) => (
                      <div key={dataType.value} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                        <Checkbox
                          checked={formData.includedData.includes(dataType.value)}
                          onCheckedChange={() => handleDataTypeToggle(dataType.value)}
                        />
                        <div>
                          <p className="text-sm font-medium">{dataType.label}</p>
                          <p className="text-xs text-muted-foreground">{dataType.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select value={formData.dateRange} onValueChange={(value) => setFormData({ ...formData, dateRange: value })}>
                    <SelectTrigger>
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate(formData)}
                  disabled={formData.includedData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileArchive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Exports</p>
                <p className="text-2xl font-bold">{exports?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {exports?.filter(e => e.status === 'completed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(exports?.reduce((sum, e) => sum + (e.fileSize || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !exports || exports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileArchive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No exports yet</h3>
            <p className="text-muted-foreground mb-4">Create your first data export to backup your organization data</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Export
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exports.map((exportData) => (
            <Card key={exportData.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon(exportData.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium capitalize">{exportData.exportType} Export</h3>
                        {getStatusBadge(exportData.status)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exportData.includedData.map((data) => (
                          <Badge key={data} variant="outline" className="text-xs capitalize">
                            {data.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      {exportData.status === 'processing' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Processing...</span>
                            <span className="text-xs text-muted-foreground">{exportData.progress}%</span>
                          </div>
                          <Progress value={exportData.progress} className="h-2" />
                        </div>
                      )}
                      {exportData.status === 'completed' && exportData.fileSize && (
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            <HardDrive className="h-3 w-3 inline mr-1" />
                            {formatFileSize(exportData.fileSize)}
                          </span>
                          {exportData.completedAt && (
                            <span>
                              <Clock className="h-3 w-3 inline mr-1" />
                              Completed {format(new Date(exportData.completedAt), 'MMM d, HH:mm')}
                            </span>
                          )}
                          {exportData.expiresAt && (
                            <span className="text-yellow-600">
                              Expires {format(new Date(exportData.expiresAt), 'MMM d')}
                            </span>
                          )}
                        </div>
                      )}
                      {exportData.status === 'failed' && exportData.errorMessage && (
                        <p className="text-sm text-red-500 mt-2">{exportData.errorMessage}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {format(new Date(exportData.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exportData.status === 'completed' && exportData.downloadUrl && (
                      <Button
                        size="sm"
                        onClick={() => window.open(exportData.downloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(exportData.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
