import { useQuery } from "@tanstack/react-query";

interface WorkspaceFeatures {
  voiceChat: boolean;
  features: Record<string, boolean>;
}

export function useWorkspaceFeatures(workspaceId?: string) {
  const queryKey = workspaceId 
    ? ['/api/workspace-features', workspaceId]
    : ['/api/workspace-features'];

  const { data, isLoading, error } = useQuery<WorkspaceFeatures>({
    queryKey,
    queryFn: async () => {
      const url = workspaceId 
        ? `/api/workspace-features?workspaceId=${workspaceId}`
        : '/api/workspace-features';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch workspace features');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    voiceChatEnabled: data?.voiceChat ?? false,
    features: data?.features ?? {},
    isLoading,
    error,
  };
}
