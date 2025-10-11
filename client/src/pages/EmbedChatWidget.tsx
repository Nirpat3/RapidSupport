import { CustomerChatWidget } from "@/components/CustomerChatWidget";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";

export default function EmbedChatWidget() {
  const [contextData, setContextData] = useState<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    console.log('[EmbedChatWidget] Extracting context from URL');
    console.log('[EmbedChatWidget] window.location.search:', window.location.search);
    
    // Extract context data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const contextParam = urlParams.get('context');
    
    console.log('[EmbedChatWidget] contextParam:', contextParam);
    
    if (contextParam) {
      try {
        const decodedContext = decodeURIComponent(contextParam);
        console.log('[EmbedChatWidget] decodedContext:', decodedContext);
        
        const parsedContext = JSON.parse(decodedContext);
        console.log('[EmbedChatWidget] parsedContext:', parsedContext);
        
        setContextData(parsedContext);
      } catch (error) {
        console.error('[EmbedChatWidget] Failed to parse context data:', error);
      }
    } else {
      console.log('[EmbedChatWidget] No context parameter in URL');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="h-screen w-screen">
          <CustomerChatWidget contextData={contextData} />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
