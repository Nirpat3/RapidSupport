import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

type PermissionLevel = 'hidden' | 'view' | 'edit';

interface UserPermission {
  id: string;
  userId: string;
  feature: string;
  permission: PermissionLevel;
}

const FEATURE_MAP: Record<string, string> = {
  '/conversations': 'conversations',
  '/activity': 'activity',
  '/dashboard': 'dashboard',
  '/customers': 'customers',
  '/ai-agents': 'ai-agents',
  '/ai-dashboard': 'ai-dashboard',
  '/ai-training': 'ai-training',
  '/ai-takeover': 'ai-takeover',
  '/knowledge': 'knowledge-base',
  '/files': 'file-management',
  '/analytics': 'analytics',
  '/feedback': 'feedback',
  '/feed': 'feed',
  '/settings': 'settings',
  '/user-management': 'user-management',
};

// Helper to extract base path from URL (handles parameterized routes)
const getBasePathFromUrl = (url: string): string => {
  // Remove query params and hash
  const cleanUrl = url.split('?')[0].split('#')[0];
  
  // Handle parameterized routes by matching base paths
  for (const [path, feature] of Object.entries(FEATURE_MAP)) {
    if (cleanUrl === path || cleanUrl.startsWith(path + '/')) {
      return path;
    }
  }
  
  return cleanUrl;
};

export function usePermissions() {
  const { user } = useAuth();
  
  const { data: permissions = [], isLoading, isError } = useQuery<UserPermission[]>({
    queryKey: ['/api/permissions/my-permissions'],
    enabled: !!user && user.role !== 'admin',
  });

  const getPermissionForFeature = (feature: string): PermissionLevel => {
    // Admins have full access to everything
    if (user?.role === 'admin') {
      return 'edit';
    }

    // If there was an error loading permissions, fail closed (deny access)
    if (isError) {
      return 'hidden';
    }

    // Find permission for this feature
    const permission = permissions.find(p => p.feature === feature);
    
    // Default to 'view' if no specific permission is set
    return permission?.permission || 'view';
  };

  const getPermissionForUrl = (url: string): PermissionLevel => {
    const basePath = getBasePathFromUrl(url);
    const feature = FEATURE_MAP[basePath];
    if (!feature) return 'view';
    return getPermissionForFeature(feature);
  };

  const canView = (feature: string): boolean => {
    const permission = getPermissionForFeature(feature);
    return permission === 'view' || permission === 'edit';
  };

  const canEdit = (feature: string): boolean => {
    const permission = getPermissionForFeature(feature);
    return permission === 'edit';
  };

  const isHidden = (feature: string): boolean => {
    const permission = getPermissionForFeature(feature);
    return permission === 'hidden';
  };

  const canViewUrl = (url: string): boolean => {
    const basePath = getBasePathFromUrl(url);
    const feature = FEATURE_MAP[basePath];
    if (!feature) return true;
    return canView(feature);
  };

  const canEditUrl = (url: string): boolean => {
    const basePath = getBasePathFromUrl(url);
    const feature = FEATURE_MAP[basePath];
    if (!feature) return false;
    return canEdit(feature);
  };

  const isUrlHidden = (url: string): boolean => {
    const basePath = getBasePathFromUrl(url);
    const feature = FEATURE_MAP[basePath];
    if (!feature) return false;
    return isHidden(feature);
  };

  return {
    permissions,
    isLoading,
    isError,
    getPermissionForFeature,
    getPermissionForUrl,
    canView,
    canEdit,
    isHidden,
    canViewUrl,
    canEditUrl,
    isUrlHidden,
  };
}
