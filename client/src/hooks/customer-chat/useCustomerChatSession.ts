import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnonymousCustomer } from "@shared/schema";

export interface ChatState {
  conversationId: string | null;
  customerId: string | null;
  sessionId: string;
  customerInfo: AnonymousCustomer | null;
  selectedCategory: string | null;
}

export interface ExistingConversationResponse {
  conversationId: string | null;
  customerId: string | null;
  customerInfo: AnonymousCustomer | null;
  ipAddress: string;
}

const STORAGE_KEY = 'customer-chat-state';

function getInitialChatState(): ChatState {
  const savedState = localStorage.getItem(STORAGE_KEY);
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      return {
        conversationId: parsed.conversationId || null,
        customerId: parsed.customerId || null,
        sessionId: parsed.sessionId || crypto.randomUUID(),
        customerInfo: parsed.customerInfo || null,
        selectedCategory: parsed.selectedCategory || null,
      };
    } catch (e) {
      console.error('Failed to parse saved chat state:', e);
    }
  }
  return {
    conversationId: null,
    customerId: null,
    sessionId: crypto.randomUUID(),
    customerInfo: null,
    selectedCategory: null,
  };
}

function getInitialOnboardingStep(chatState: ChatState): 'category' | 'info' | 'ready' {
  if (chatState.selectedCategory && chatState.customerInfo) {
    return 'ready';
  }
  return 'category';
}

export function useCustomerChatSession() {
  const [chatState, setChatState] = useState<ChatState>(getInitialChatState);
  const [chatStarted, setChatStarted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'category' | 'info' | 'ready'>(() => 
    getInitialOnboardingStep(chatState)
  );

  const { data: existingConversation } = useQuery<ExistingConversationResponse | null>({
    queryKey: ['/api/customer-chat/check-session', chatState.sessionId],
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatState));
  }, [chatState]);

  useEffect(() => {
    if (existingConversation?.conversationId && !chatState.conversationId) {
      setChatState((prev) => ({
        ...prev,
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        sessionId: chatState.sessionId,
        customerInfo: existingConversation.customerInfo,
      }));
    }
  }, [existingConversation]);

  const resetSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setChatState({
      conversationId: null,
      customerId: null,
      sessionId: crypto.randomUUID(),
      customerInfo: null,
      selectedCategory: null,
    });
    setChatStarted(false);
    setOnboardingStep('category');
  };

  const selectCategory = (categoryId: string) => {
    setChatState(prev => ({ ...prev, selectedCategory: categoryId }));
    setOnboardingStep('info');
  };

  const setCustomerInfo = (info: AnonymousCustomer) => {
    setChatState(prev => ({ ...prev, customerInfo: info }));
    setOnboardingStep('ready');
  };

  const updateChatState = (updates: Partial<ChatState>) => {
    setChatState(prev => ({ ...prev, ...updates }));
  };

  return {
    chatState,
    setChatState: updateChatState,
    chatStarted,
    setChatStarted,
    onboardingStep,
    setOnboardingStep,
    existingConversation,
    resetSession,
    selectCategory,
    setCustomerInfo,
  };
}
