import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Tags, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Loader2,
  GripVertical,
  CreditCard,
  DollarSign,
  Wrench,
  HelpCircle,
  Bot,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SupportCategory, AiAgent } from "@shared/schema";

const ICON_OPTIONS = [
  { value: 'CreditCard', label: 'Credit Card', icon: CreditCard },
  { value: 'DollarSign', label: 'Dollar Sign', icon: DollarSign },
  { value: 'Wrench', label: 'Wrench', icon: Wrench },
  { value: 'HelpCircle', label: 'Help Circle', icon: HelpCircle },
  { value: 'Bot', label: 'Bot', icon: Bot },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
];

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ef4444', label: 'Red' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#84cc16', label: 'Lime' },
];

function getIconComponent(iconName: string | null) {
  const iconMap: Record<string, typeof CreditCard> = {
    CreditCard,
    DollarSign,
    Wrench,
    HelpCircle,
    Bot,
    Sparkles,
  };
  return iconMap[iconName || 'HelpCircle'] || HelpCircle;
}

export default function SupportCategoriesPage() {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'HelpCircle',
    color: '#6366f1',
    displayOrder: 0,
    isVisible: true,
    isActive: true,
    aiAgentId: null as string | null,
    suggestedQuestions: ['', '', ''],
  });

  const { data: categories, isLoading } = useQuery<SupportCategory[]>({
    queryKey: ['/api/support-categories'],
  });

  const { data: aiAgents } = useQuery<AiAgent[]>({
    queryKey: ['/api/ai/agents'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<SupportCategory>) => {
      return apiRequest('/api/support-categories', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-categories'] });
      toast({ title: "Category created", description: "Support category has been created successfully." });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create category." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupportCategory> }) => {
      return apiRequest(`/api/support-categories/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-categories'] });
      toast({ title: "Category updated", description: "Support category has been updated successfully." });
      setEditingCategory(null);
      resetForm();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update category." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/support-categories/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-categories'] });
      toast({ title: "Category deleted", description: "Support category has been deleted successfully." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete category." });
    }
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/support-categories/seed', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support-categories'] });
      toast({ title: "Categories seeded", description: "Default support categories have been created." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error?.message || "Failed to seed categories. They may already exist." 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'HelpCircle',
      color: '#6366f1',
      displayOrder: categories?.length || 0,
      isVisible: true,
      isActive: true,
      aiAgentId: null,
      suggestedQuestions: ['', '', ''],
    });
  };

  const handleEdit = (category: SupportCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || 'HelpCircle',
      color: category.color || '#6366f1',
      displayOrder: category.displayOrder,
      isVisible: category.isVisible,
      isActive: category.isActive,
      aiAgentId: category.aiAgentId,
      suggestedQuestions: category.suggestedQuestions || ['', '', ''],
    });
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      suggestedQuestions: formData.suggestedQuestions.filter(q => q.trim() !== ''),
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleVisibility = (category: SupportCategory) => {
    updateMutation.mutate({ 
      id: category.id, 
      data: { isVisible: !category.isVisible } 
    });
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...formData.suggestedQuestions];
    newQuestions[index] = value;
    setFormData({ ...formData, suggestedQuestions: newQuestions });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CategoryForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                name: e.target.value,
                slug: generateSlug(e.target.value)
              });
            }}
            placeholder="e.g., Billing"
            data-testid="input-category-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g., billing"
            data-testid="input-category-slug"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="A short description of this category"
          data-testid="input-category-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select
            value={formData.icon}
            onValueChange={(value) => setFormData({ ...formData, icon: value })}
          >
            <SelectTrigger data-testid="select-category-icon">
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <Select
            value={formData.color}
            onValueChange={(value) => setFormData({ ...formData, color: value })}
          >
            <SelectTrigger data-testid="select-category-color">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: option.value }}
                    />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assigned AI Agent</Label>
        <Select
          value={formData.aiAgentId || "none"}
          onValueChange={(value) => setFormData({ 
            ...formData, 
            aiAgentId: value === "none" ? null : value 
          })}
        >
          <SelectTrigger data-testid="select-ai-agent">
            <SelectValue placeholder="Select AI agent (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific agent</SelectItem>
            {aiAgents?.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span>{agent.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Assign a specific AI agent to handle conversations in this category
        </p>
      </div>

      <div className="space-y-2">
        <Label>Suggested Questions</Label>
        {formData.suggestedQuestions.map((question, index) => (
          <Input
            key={index}
            value={question}
            onChange={(e) => handleQuestionChange(index, e.target.value)}
            placeholder={`Suggested question ${index + 1}`}
            data-testid={`input-suggested-question-${index}`}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          These questions will appear as suggestions for customers
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          value={formData.displayOrder}
          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
          data-testid="input-display-order"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="isVisible"
            checked={formData.isVisible}
            onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
            data-testid="switch-is-visible"
          />
          <Label htmlFor="isVisible">Visible to customers</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-is-active"
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Tags className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Support Categories</h1>
            <p className="text-sm text-muted-foreground">Manage customer support categories and routing</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(!categories || categories.length === 0) && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-categories"
            >
              {seedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Seed Defaults
            </Button>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} data-testid="button-create-category">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Support Category</DialogTitle>
                <DialogDescription>
                  Add a new support category for customer chat routing
                </DialogDescription>
              </DialogHeader>
              <CategoryForm />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !formData.name || !formData.slug}
                  data-testid="button-submit-category"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-auto">
        {categories?.map((category) => {
          const Icon = getIconComponent(category.icon);
          const assignedAgent = aiAgents?.find(a => a.id === category.aiAgentId);
          
          return (
            <Card 
              key={category.id} 
              className={`relative ${!category.isVisible ? 'opacity-60' : ''}`}
              data-testid={`category-card-${category.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color || '#6366f1' }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <code className="text-xs text-muted-foreground">{category.slug}</code>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleVisibility(category)}
                      data-testid={`button-toggle-visibility-${category.id}`}
                    >
                      {category.isVisible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-${category.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-delete-${category.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the "{category.name}" category? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`button-confirm-delete-${category.id}`}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={category.isVisible ? "outline" : "secondary"}>
                    {category.isVisible ? "Visible" : "Hidden"}
                  </Badge>
                  {assignedAgent && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {assignedAgent.name}
                    </Badge>
                  )}
                </div>
                {category.suggestedQuestions && category.suggestedQuestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Suggested Questions:</p>
                    <ul className="text-xs space-y-1">
                      {category.suggestedQuestions.slice(0, 3).map((q, i) => (
                        <li key={i} className="truncate">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!categories || categories.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tags className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create support categories to help route customer conversations
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-defaults"
                >
                  {seedMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Use Defaults
                </Button>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Support Category</DialogTitle>
            <DialogDescription>
              Update the category settings
            </DialogDescription>
          </DialogHeader>
          <CategoryForm />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !formData.name || !formData.slug}
              data-testid="button-update-category"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
