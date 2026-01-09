import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Search, 
  File, 
  Image, 
  FileText, 
  Archive,
  Trash2,
  Download,
  Eye,
  Link,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import type { UploadedFile } from '@shared/schema';

interface FileUploadResult {
  file: UploadedFile;
  isDuplicate: boolean;
  originalFile?: UploadedFile;
}

interface FileListResponse {
  files: UploadedFile[];
  total: number;
  page: number;
  totalPages: number;
}

const FILE_CATEGORIES = [
  'General',
  'Documentation',
  'Training Material',
  'Product Info',
  'Legal',
  'Technical',
  'Marketing'
];

const FILE_STATUS_COLORS = {
  uploaded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface FileManagementPageProps {
  embedded?: boolean;
}

export default function FileManagementPage({ embedded = false }: FileManagementPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadTags, setUploadTags] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch files with filtering and pagination
  const { data: filesData, isLoading, refetch } = useQuery({
    queryKey: ['/api/files', currentPage, searchTerm, filterCategory, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory && filterCategory !== 'all') params.append('category', filterCategory);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await fetch(`/api/files?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      return response.json() as Promise<FileListResponse>;
    },
    enabled: true
  });

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const results = data.results as FileUploadResult[];
      const successCount = results.length;
      const duplicateCount = results.filter(r => r.isDuplicate).length;
      
      if (duplicateCount > 0) {
        toast({
          title: "Files uploaded with duplicates detected",
          description: `${successCount} files uploaded, ${duplicateCount} duplicates found`,
          variant: "default"
        });
      } else {
        toast({
          title: "Files uploaded successfully",
          description: `${successCount} files uploaded and processing started`,
          variant: "default"
        });
      }
      
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "File has been successfully deleted",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // File selection handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Upload handlers
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('category', uploadCategory);
    formData.append('tags', uploadTags);

    uploadFilesMutation.mutate(formData);
  };

  const handleDeleteFile = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      deleteFileMutation.mutate(fileId);
    }
  };

  const files = (filesData as FileListResponse)?.files || [];
  const totalPages = (filesData as FileListResponse)?.totalPages || 1;

  return (
    <div className="space-y-6 p-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">File Management</h1>
            <p className="text-muted-foreground">
              Upload, organize, and manage files for AI training and knowledge base integration
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            <File className="h-4 w-4 mr-2" />
            Manage Files
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Files</CardTitle>
              <CardDescription>
                Drag and drop files or click to select. Supports PDF, TXT, and DOCX files up to 10MB each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                data-testid="file-drop-zone"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Drop files here or click to browse'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, TXT, DOCX files up to 10MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="file-input"
                />
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.type)}
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Upload Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    placeholder="e.g., onboarding, tutorial, FAQ"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    data-testid="input-tags"
                  />
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploadFilesMutation.isPending}
                  data-testid="button-upload"
                >
                  {uploadFilesMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger data-testid="select-filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {FILE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Files List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>
                {(filesData as FileListResponse)?.total || 0} files total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No files found. Upload some files to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file: UploadedFile) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        {getFileIcon(file.mimeType)}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{file.originalName}</h4>
                            {file.duplicateOfId && (
                              <Badge variant="outline" className="text-xs">
                                <Copy className="h-3 w-3 mr-1" />
                                Duplicate
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{file.category}</span>
                            <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {file.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            className={`${FILE_STATUS_COLORS[file.status as keyof typeof FILE_STATUS_COLORS]} border-0`}
                          >
                            {file.status === 'uploaded' && <Clock className="h-3 w-3 mr-1" />}
                            {file.status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                            {file.status === 'processed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {file.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {file.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                          data-testid={`button-view-${file.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id)}
                          disabled={deleteFileMutation.isPending}
                          data-testid={`button-delete-${file.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Analytics</CardTitle>
              <CardDescription>
                Overview of file usage and processing statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" data-testid="dialog-file-details">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">File Name</h4>
                  <p className="text-sm text-muted-foreground">{selectedFile.originalName}</p>
                </div>
                <div>
                  <h4 className="font-medium">Size</h4>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <h4 className="font-medium">Category</h4>
                  <p className="text-sm text-muted-foreground">{selectedFile.category}</p>
                </div>
                <div>
                  <h4 className="font-medium">Status</h4>
                  <Badge className={`${FILE_STATUS_COLORS[selectedFile.status as keyof typeof FILE_STATUS_COLORS]} border-0`}>
                    {selectedFile.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Uploaded</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedFile.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {selectedFile.processedAt && (
                  <div>
                    <h4 className="font-medium">Processed</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedFile.processedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              {selectedFile.status === 'error' && selectedFile.errorMessage && (
                <div>
                  <h4 className="font-medium">Error Details</h4>
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {selectedFile.errorMessage}
                  </p>
                </div>
              )}

              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedFile.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedFile.duplicateOfId && (
                <div>
                  <h4 className="font-medium">Duplicate Information</h4>
                  <p className="text-sm text-muted-foreground">
                    This file is a duplicate of an existing file.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}