import { useQuery } from "@tanstack/react-query";
import { SupportCategory as SupportCategoryType } from "@shared/schema";
import { 
  CreditCard, 
  DollarSign, 
  Wrench, 
  HelpCircle, 
  Headphones, 
  Package, 
  Settings,
  GraduationCap,
  Monitor,
  type LucideIcon 
} from "lucide-react";

export interface CategoryOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  suggestedQuestions: string[];
  aiAgentId: string | number | null;
  usageCount?: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  DollarSign,
  Wrench,
  HelpCircle,
  Headphones,
  Package,
  Settings,
  GraduationCap,
  Monitor,
};

const getIconComponent = (iconName: string | null): LucideIcon => {
  if (!iconName) return HelpCircle;
  return ICON_MAP[iconName] || HelpCircle;
};

const getColorClass = (color: string | null): string => {
  const colorMap: Record<string, string> = {
    blue: 'text-primary',
    indigo: 'text-primary',
    green: 'text-accent',
    teal: 'text-accent',
    cyan: 'text-accent',
    orange: 'text-amber-500',
    yellow: 'text-amber-500',
    red: 'text-destructive',
    purple: 'text-primary',
    pink: 'text-primary',
  };
  if (!color) return 'text-primary';
  return colorMap[color] || 'text-primary';
};

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'billing', label: 'Billing', description: 'Payment and subscription inquiries', icon: CreditCard, color: 'text-primary', suggestedQuestions: [], aiAgentId: null, usageCount: 150 },
  { id: 'general', label: 'General', description: 'Other questions and feedback', icon: HelpCircle, color: 'text-primary', suggestedQuestions: [], aiAgentId: null, usageCount: 120 },
  { id: 'onboarding', label: 'Onboarding', description: 'Getting started and setup help', icon: GraduationCap, color: 'text-accent', suggestedQuestions: [], aiAgentId: null, usageCount: 95 },
  { id: 'hardware', label: 'Hardware', description: 'Device and equipment support', icon: Monitor, color: 'text-amber-500', suggestedQuestions: [], aiAgentId: null, usageCount: 80 },
  { id: 'technical', label: 'Technical', description: 'Technical issues and troubleshooting', icon: Wrench, color: 'text-amber-500', suggestedQuestions: [], aiAgentId: null, usageCount: 110 },
  { id: 'sales', label: 'Sales', description: 'Product and pricing questions', icon: DollarSign, color: 'text-accent', suggestedQuestions: [], aiAgentId: null, usageCount: 65 },
];

export const getCategoryTranslation = (t: (key: string) => string, categoryId: string, field: 'name' | 'description'): string | null => {
  const categoryKeyMap: Record<string, { name: string; desc: string }> = {
    'billing': { name: 'categories.billing', desc: 'categories.billingDesc' },
    'technical': { name: 'categories.technical', desc: 'categories.technicalDesc' },
    'sales': { name: 'categories.sales', desc: 'categories.salesDesc' },
    'general': { name: 'categories.general', desc: 'categories.generalDesc' },
    'technical-support': { name: 'categories.technical', desc: 'categories.technicalDesc' },
  };
  
  const slug = categoryId.toLowerCase().replace(/\s+/g, '-');
  const mapping = categoryKeyMap[slug];
  if (!mapping) return null;
  
  const key = field === 'name' ? mapping.name : mapping.desc;
  const translated = t(key);
  return translated !== key ? translated : null;
};

export function useSupportCategories() {
  const { data: apiCategories = [] } = useQuery<SupportCategoryType[]>({
    queryKey: ['/api/support-categories/public'],
    staleTime: 5 * 60 * 1000,
  });

  const categories: CategoryOption[] = apiCategories.length > 0
    ? apiCategories.map((cat) => ({
        id: cat.slug,
        label: cat.name,
        description: cat.description || '',
        icon: getIconComponent(cat.icon),
        color: getColorClass(cat.color),
        suggestedQuestions: cat.suggestedQuestions || [],
        aiAgentId: cat.aiAgentId,
        usageCount: (cat as any).usageCount || 0,
      }))
    : DEFAULT_CATEGORIES;

  // Sort categories by usage count (most popular first)
  const sortedCategories = [...categories].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  
  // Get the most popular category
  const mostPopularCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  const getCategoryById = (id: string | null) => {
    if (!id) return null;
    return categories.find(c => c.id === id) || null;
  };

  return {
    categories: sortedCategories,
    getCategoryById,
    mostPopularCategory,
    isLoading: !apiCategories,
  };
}
