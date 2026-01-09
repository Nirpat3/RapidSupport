import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { 
  Send, 
  Sparkles,
  MessageCircle, 
  ArrowRight,
  User,
  Building2,
  Mail,
  Phone,
  Paperclip,
  Camera,
  Smile,
  Mic,
  X,
  Image as ImageIcon,
  FileText,
  MessageSquarePlus,
  LogIn
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { CustomerInfoForm } from "@/components/CustomerInfoForm";
import { ConversationRatingDialog } from "@/components/ConversationRatingDialog";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { AnonymousCustomer, SupportCategory as SupportCategoryType } from "@shared/schema";
import { renderFormattedContent } from "@/components/ChatMessage";
import { CreditCard, DollarSign, Wrench, HelpCircle, Headphones, Package, Settings, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  DollarSign,
  Wrench,
  HelpCircle,
  Headphones,
  Package,
  Settings,
};

const getIconComponent = (iconName: string | null): LucideIcon => {
  if (!iconName) return HelpCircle;
  return ICON_MAP[iconName] || HelpCircle;
};

interface CategoryOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  suggestedQuestions: string[];
  aiAgentId: string | number | null;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'billing', label: 'Billing', description: 'Payment and subscription inquiries', icon: CreditCard, color: 'text-primary', suggestedQuestions: [], aiAgentId: null },
  { id: 'sales', label: 'Sales', description: 'Product and pricing questions', icon: DollarSign, color: 'text-accent', suggestedQuestions: [], aiAgentId: null },
  { id: 'technical', label: 'Technical Support', description: 'Technical issues and troubleshooting', icon: Wrench, color: 'text-amber-500', suggestedQuestions: [], aiAgentId: null },
  { id: 'general', label: 'General', description: 'Other questions and feedback', icon: HelpCircle, color: 'text-primary', suggestedQuestions: [], aiAgentId: null },
];

// Helper to translate category names and descriptions
const getCategoryTranslation = (t: (key: string) => string, categoryId: string, field: 'name' | 'description'): string | null => {
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
  // Return null if translation key is returned (meaning no translation found)
  return translated !== key ? translated : null;
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

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'ai';
  senderName: string;
  timestamp: string;
  attachments?: Attachment[];
}

interface ExistingConversationResponse {
  conversationId: string | null;
  customerId: string | null;
  customerInfo: AnonymousCustomer | null;
  ipAddress: string;
}

interface CreateCustomerResponse {
  customerId: string;
  conversationId: string;
  customerInfo: AnonymousCustomer;
}

interface ChatState {
  conversationId: string | null;
  customerId: string | null;
  sessionId: string;
  customerInfo: AnonymousCustomer | null;
  selectedCategory: string | null;
}

interface ConversationDetails {
  id: string;
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  assignedAgentId: string | null;
}

interface OrganizationBranding {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
}

export default function CustomerChatPage() {
  const { t, i18n } = useTranslation();
  const [question, setQuestion] = useState("");
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // File upload, emoji, camera, voice states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // WebSocket state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // White-label branding: Get organization slug from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const orgSlug = urlParams.get('org');
  
  // Fetch organization branding if org slug is provided
  const { data: branding } = useQuery<OrganizationBranding>({
    queryKey: ['/api/organizations', orgSlug, 'branding'],
    enabled: !!orgSlug,
  });

  // Initialize chat state with localStorage persistence
  const [chatState, setChatState] = useState<ChatState>(() => {
    const savedState = localStorage.getItem('customer-chat-state');
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
  });

  // Initialize chatStarted to false - let user choose to continue or start new
  const [chatStarted, setChatStarted] = useState(false);
  
  // Category selection state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
  // Rating dialog state
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const ratingCheckDone = useRef(false);

  // AI response state
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [aiTypingTimeout, setAiTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle language change - notify backend so translations work correctly
  const handleLanguageChange = async (langCode: string) => {
    if (chatState.conversationId) {
      try {
        await fetch('/api/customer-chat/set-language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: chatState.conversationId,
            language: langCode
          })
        });
        console.log(`[CustomerChat] Set customer language to ${langCode} for conversation ${chatState.conversationId}`);
      } catch (error) {
        console.error('[CustomerChat] Failed to set language:', error);
      }
    }
  };

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('customer-chat-state', JSON.stringify(chatState));
  }, [chatState]);
  
  // WebSocket connection for real-time updates (no auth required for customer chat)
  useEffect(() => {
    // Customer chat doesn't use WebSocket auth, only staff connections do
    // So we won't establish a WebSocket connection here to avoid auth errors
    // Instead, we'll rely on polling for customer messages
    return;
  }, []);
  
  // Join conversation via WebSocket when conversationId changes
  useEffect(() => {
    if (!chatState.conversationId) return;
    
    // For customer chat, we rely on polling instead of WebSocket
    // because customer WebSocket connections don't have authentication
    return;
  }, [chatState.conversationId]);

  // Check for existing conversation - always run to get IP address
  const { data: existingConversation } = useQuery<ExistingConversationResponse | null>({
    queryKey: ['/api/customer-chat/check-session', chatState.sessionId],
  });

  // Fetch messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/customer-chat/messages', chatState.conversationId],
    enabled: !!chatState.conversationId,
    refetchInterval: chatStarted ? 1000 : false, // Poll more frequently for real-time feel
  });

  // Fetch conversation details to check status (using public endpoint)
  const { data: conversationDetails } = useQuery<ConversationDetails>({
    queryKey: ['/api/customer-chat/conversation', chatState.conversationId, 'status'],
    enabled: !!chatState.conversationId && chatStarted,
    refetchInterval: chatStarted ? 5000 : false,
  });

  // Fetch support categories from API
  const { data: apiCategories = [] } = useQuery<SupportCategoryType[]>({
    queryKey: ['/api/support-categories/public'],
    staleTime: 5 * 60 * 1000,
  });

  // Transform API categories to component format, with fallback to defaults
  const SUPPORT_CATEGORIES: CategoryOption[] = apiCategories.length > 0
    ? apiCategories.map((cat) => ({
        id: cat.slug,
        label: cat.name,
        description: cat.description || '',
        icon: getIconComponent(cat.icon),
        color: getColorClass(cat.color),
        suggestedQuestions: cat.suggestedQuestions || [],
        aiAgentId: cat.aiAgentId,
      }))
    : DEFAULT_CATEGORIES;

  // Check if conversation is closed and show rating dialog
  useEffect(() => {
    console.log('[CustomerChatPage] Conversation details:', conversationDetails);
    console.log('[CustomerChatPage] Chat state conversationId:', chatState.conversationId);
    
    if ((conversationDetails?.status === 'closed' || conversationDetails?.status === 'resolved') && 
        !ratingCheckDone.current && 
        chatState.conversationId) {
      
      console.log('[CustomerChatPage] Conversation is closed/resolved, checking for existing rating...');
      ratingCheckDone.current = true; // Mark as checked to prevent duplicate calls
      
      // Check if rating already submitted for this conversation
      const checkRating = async () => {
        try {
          const rating = await apiRequest(`/api/conversations/${chatState.conversationId}/rating`, 'GET');
          console.log('[CustomerChatPage] Rating already exists:', rating);
          // If rating exists, don't show dialog
        } catch (error: any) {
          console.log('[CustomerChatPage] Error checking rating:', error);
          // If 404 (no rating found), show the rating dialog
          if (error.message?.includes('404') || error.message?.includes('No rating found')) {
            console.log('[CustomerChatPage] No rating found, showing dialog. chatState.conversationId:', chatState.conversationId);
            console.log('[CustomerChatPage] Setting showRatingDialog to true');
            setShowRatingDialog(true);
            console.log('[CustomerChatPage] showRatingDialog state should now be true');
          } else {
            console.log('[CustomerChatPage] Error is not 404, not showing dialog:', error.message);
            ratingCheckDone.current = false; // Reset on error to allow retry
          }
        }
      };
      checkRating();
    }
  }, [conversationDetails?.status, chatState.conversationId]);

  // Helper to get selected category info
  const getSelectedCategoryInfo = () => {
    return SUPPORT_CATEGORIES.find(c => c.id === chatState.selectedCategory);
  };

  // Create customer and conversation
  const createCustomerMutation = useMutation<CreateCustomerResponse, Error, AnonymousCustomer>({
    mutationFn: async (customerData: AnonymousCustomer) => {
      const selectedCategory = getSelectedCategoryInfo();
      const response = await apiRequest('/api/customer-chat/create-customer', 'POST', {
        ...customerData,
        ipAddress: '',
        sessionId: chatState.sessionId,
        contextData: {
          selectedCategory: chatState.selectedCategory,
          categoryLabel: selectedCategory?.label,
          aiAgentId: selectedCategory?.aiAgentId,
        },
      });
      return response;
    },
    onSuccess: async (response) => {
      setChatState((prev) => ({
        ...prev,
        conversationId: response.conversationId,
        customerId: response.customerId,
        sessionId: chatState.sessionId,
        customerInfo: response.customerInfo,
      }));
      setShowInfoDialog(false);
      setChatStarted(true);
      
      // Send the pending message and/or files with IDs from the response
      if (pendingMessage.trim() || pendingFiles.length > 0) {
        const messageContent = pendingMessage.trim() || (pendingFiles.length > 0 ? '[Attachment]' : '');
        const messageResponse = await sendMessageMutation.mutateAsync({
          content: messageContent,
          conversationId: response.conversationId,
          customerId: response.customerId,
        });
        
        // Upload pending files if they exist
        if (pendingFiles.length > 0 && messageResponse?.id) {
          const formData = new FormData();
          pendingFiles.forEach(file => {
            formData.append('files', file);
          });
          formData.append('messageId', messageResponse.id);

          try {
            await fetch('/api/customer-chat/upload-files', {
              method: 'POST',
              body: formData,
            });
          } catch (error) {
            console.error('Failed to upload pending files:', error);
          }
        }
        
        setPendingMessage("");
        setPendingFiles([]);
        setSelectedFiles([]);
      }
    },
  });

  // Send message mutation with optional conversation/customer ID override
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, conversationId, customerId }: { 
      content: string; 
      conversationId?: string; 
      customerId?: string;
    }) => {
      const convId = conversationId || chatState.conversationId;
      const custId = customerId || chatState.customerId;
      
      if (!convId) {
        throw new Error("No active conversation");
      }
      console.log(`[SEND MESSAGE] Sending message: "${content}"`);
      return await apiRequest('/api/customer-chat/send-message', 'POST', {
        conversationId: convId,
        content,
        customerId: custId,
      });
    },
    onSuccess: (data, variables) => {
      console.log(`[SEND MESSAGE SUCCESS] Message sent successfully. ID: ${data?.id}`);
      console.log(`[SEND MESSAGE SUCCESS] Calling triggerAiResponse with message ID: ${data?.id}`);
      
      setQuestion("");
      refetchMessages();
      
      // Trigger AI agent response after customer message using message ID
      if (variables.content && data?.id) {
        triggerAiResponse(data.id, variables.content);
      }
    },
  });

  // AI Agent Response mutation
  const aiResponseMutation = useMutation({
    mutationFn: async (customerMessage: string) => {
      const mutationId = `mut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[${mutationId}] ===== AI MUTATION CALLED =====`);
      console.log(`[${mutationId}] Message: "${customerMessage.substring(0, 50)}..."`);
      console.log(`[${mutationId}] ConvID: ${chatState.conversationId}`);
      
      if (!chatState.conversationId) {
        throw new Error("No active conversation");
      }
      
      const result = await apiRequest('/api/ai/smart-response', 'POST', {
        conversationId: chatState.conversationId,
        customerMessage,
        customerId: chatState.customerId,
        language: i18n.language, // Pass user's selected language for AI response
      });
      
      console.log(`[${mutationId}] ===== AI MUTATION RESPONSE RECEIVED =====`);
      return result;
    },
    onSuccess: (response) => {
      console.log('AI response generated:', response);
      
      // AI message is now created server-side for security
      // Just refresh messages to show the new AI response
      refetchMessages();
      
      setIsAiResponding(false);
      if (aiTypingTimeout) {
        clearTimeout(aiTypingTimeout);
        setAiTypingTimeout(null);
      }

      // Mark processing as complete and process next message in queue
      isProcessingQueueRef.current = false;
      processNextAiResponse();
    },
    onError: (error) => {
      console.error('Failed to generate AI response:', error);
      setIsAiResponding(false);
      if (aiTypingTimeout) {
        clearTimeout(aiTypingTimeout);
        setAiTypingTimeout(null);
      }

      // Mark processing as complete and process next message in queue
      isProcessingQueueRef.current = false;
      processNextAiResponse();
    },
  });

  // Queue system to ensure every message gets exactly one AI response
  // Track by message ID instead of content to allow repeated identical messages
  const aiMessageQueueRef = useRef<{messageId: string, content: string}[]>([]);
  const isProcessingQueueRef = useRef(false);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Process the next message in the queue
  const processNextAiResponse = useCallback(() => {
    if (isProcessingQueueRef.current || aiMessageQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const nextItem = aiMessageQueueRef.current.shift()!;
    
    // Mark this message ID as processed to prevent future duplicates
    processedMessageIdsRef.current.add(nextItem.messageId);
    console.log(`Processing AI response for message ID: ${nextItem.messageId}. Content: "${nextItem.content}". Total processed: ${processedMessageIdsRef.current.size}`);
    
    setIsAiResponding(true);
    
    // Add realistic typing delay (2-4 seconds)
    const typingDelay = Math.random() * 2000 + 2000;
    const timeout = setTimeout(() => {
      aiResponseMutation.mutate(nextItem.content);
    }, typingDelay);
    
    setAiTypingTimeout(timeout);
  }, [aiResponseMutation]);

  // Trigger AI response with queueing to prevent duplicates while ensuring all messages get responses
  const triggerAiResponse = useCallback((messageId: string, customerMessage: string) => {
    // Check if this message ID has already been processed
    if (processedMessageIdsRef.current.has(messageId)) {
      console.log(`AI response already processed for message ID: ${messageId}, skipping`);
      return;
    }
    
    // Check if this message ID is already in the queue
    const isDuplicate = aiMessageQueueRef.current.some(item => item.messageId === messageId);
    
    if (isDuplicate) {
      console.log(`Message ID ${messageId} already in queue, skipping duplicate`);
      return;
    }
    
    // Add message to queue with ID
    aiMessageQueueRef.current.push({ messageId, content: customerMessage });
    console.log(`AI message queued. Message ID: ${messageId}. Queue length: ${aiMessageQueueRef.current.length}`);
    
    // Process if not already processing
    processNextAiResponse();
  }, [processNextAiResponse]);

  // Reset processed messages when conversation changes
  useEffect(() => {
    // Clear processed IDs when starting a new conversation
    processedMessageIdsRef.current.clear();
    aiMessageQueueRef.current = [];
    console.log(`Conversation changed to: ${chatState.conversationId}. Reset processed messages.`);
  }, [chatState.conversationId]);

  // Cleanup AI typing timeout on unmount
  useEffect(() => {
    return () => {
      if (aiTypingTimeout) {
        clearTimeout(aiTypingTimeout);
      }
    };
  }, [aiTypingTimeout]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatStarted]);

  // Sync state with existing conversation from API (don't auto-start)
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

  const handleAskQuestion = async () => {
    console.log(`[HANDLE ASK QUESTION] Called. Question: "${question}", chatStarted: ${chatStarted}`);
    
    if (!question.trim() && selectedFiles.length === 0) return;

    // If chat already started (in chat interface), send message
    if (chatStarted && chatState.conversationId) {
      const messageContent = question.trim() || (selectedFiles.length > 0 ? '[Attachment]' : '');
      console.log(`[HANDLE ASK QUESTION] Sending message via mutation: "${messageContent}"`);
      const response = await sendMessageMutation.mutateAsync({ content: messageContent });
      if (selectedFiles.length > 0 && response?.id) {
        await uploadFiles(response.id);
      }
      return;
    }

    // Hero "Ask" button always starts a NEW conversation
    // First show category selection, then info dialog
    console.log(`[HANDLE ASK QUESTION] Opening category selection for new conversation`);
    setPendingMessage(question);
    setPendingFiles(selectedFiles);
    setShowCategoryDialog(true);
  };

  const handleCategorySelect = (categoryId: string) => {
    setChatState((prev) => ({
      ...prev,
      selectedCategory: categoryId,
    }));
    setShowCategoryDialog(false);
    setShowInfoDialog(true);
  };

  const handleBackToCategories = () => {
    setChatState((prev) => ({
      ...prev,
      selectedCategory: null,
    }));
    setShowInfoDialog(false);
    setShowCategoryDialog(true);
  };

  const handleCustomerInfoSubmit = async (customerData: AnonymousCustomer) => {
    await createCustomerMutation.mutateAsync(customerData);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    setShowEmojiPicker(false); // Close emoji picker when selecting files
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
    setShowEmojiPicker(false); // Close emoji picker when capturing photo
  };

  // Open camera using native file input (works reliably on mobile)
  const openCamera = () => {
    setShowEmojiPicker(false); // Close emoji picker when opening camera
    cameraInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (messageId: string) => {
    if (selectedFiles.length === 0) return;
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('messageId', messageId);

    try {
      await fetch('/api/customer-chat/upload-files', {
        method: 'POST',
        body: formData,
      });
      setSelectedFiles([]);
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  };

  // Emoji picker handler
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setQuestion(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Voice-to-text handler with wake word detection
  const toggleVoiceRecognition = () => {
    setShowEmojiPicker(false); // Close emoji picker when using voice
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      // Clear previous text when starting a new recording
      setQuestion('');
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Wake word patterns to detect "Hey Ellie" or "Ellie" at start
      const wakeWordPatterns = [
        /^hey\s+ellie\s*/i,
        /^ellie\s*/i,
        /^hey\s+elly\s*/i,
        /^elly\s*/i,
      ];
      
      recognition.onresult = (event: any) => {
        let transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        // Check for wake word at the beginning and remove it
        for (const pattern of wakeWordPatterns) {
          if (pattern.test(transcript)) {
            // Wake word detected - clear any existing text and use the message after wake word
            transcript = transcript.replace(pattern, '').trim();
            break;
          }
        }
        
        setQuestion(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  const handleStartNewConversation = () => {
    // Clear localStorage
    localStorage.removeItem('customer-chat-state');
    // Reset state
    setChatState({
      conversationId: null,
      customerId: null,
      sessionId: crypto.randomUUID(),
      customerInfo: null,
      selectedCategory: null,
    });
    setChatStarted(false);
    setShowCategoryDialog(false);
    setQuestion('');
    setSelectedFiles([]);
  };

  // Fetch personalized suggested questions based on customer history
  const { data: suggestedQuestionsData } = useQuery<{ questions: string[] }>({
    queryKey: ['/api/customer-chat/suggested-questions', chatState.customerId, chatState.sessionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (chatState.customerId) {
        params.append('customerId', chatState.customerId);
      }
      if (chatState.sessionId) {
        params.append('sessionId', chatState.sessionId);
      }
      return await apiRequest(`/api/customer-chat/suggested-questions?${params.toString()}`, 'GET');
    },
  });

  const suggestedQuestions = suggestedQuestionsData?.questions || [
    "How do I reset my password?",
    "What are your pricing plans?",
    "How can I upgrade my account?",
    "I need help with billing",
  ];

  // If chat has started, show the chat interface
  if (chatStarted && chatState.conversationId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        {/* Header with white-label branding support */}
        <header 
          className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10"
          style={branding?.primaryColor ? { borderBottomColor: branding.primaryColor } : undefined}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Organization logo or default icon */}
                {branding?.logo ? (
                  <img 
                    src={branding.logo} 
                    alt={branding.name} 
                    className="h-10 w-10 rounded-xl object-contain shadow-sm"
                    data-testid="img-org-logo"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm"
                    style={branding?.primaryColor ? { background: `linear-gradient(to bottom right, ${branding.primaryColor}, ${branding.primaryColor}CC)` } : undefined}
                  >
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h1 
                    className="text-lg font-semibold" 
                    data-testid="title-support-chat"
                    style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}
                  >
                    {branding?.name ? `${branding.name} Support` : 'Support Chat'}
                  </h1>
                  {chatState.customerInfo && (
                    <p className="text-xs text-muted-foreground">{chatState.customerInfo.name}</p>
                  )}
                  {existingConversation?.ipAddress && (
                    <p className="text-xs text-muted-foreground" data-testid="text-user-ip">
                      Your IP: {existingConversation.ipAddress}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/portal/login'}
                  className="gap-2"
                  data-testid="button-portal-login"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Portal</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewConversation}
                  className="gap-2"
                  data-testid="button-new-conversation"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </Button>
                <Badge className="gap-1.5 bg-accent text-accent-foreground">
                  <div className="w-2 h-2 bg-accent-foreground/80 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.senderType === 'customer' ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${message.id}`}
                >
                  {message.senderType !== 'customer' && (
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.senderType === 'ai' ? "bg-accent/10" : "bg-primary/10"
                    )}>
                      <Sparkles className={cn(
                        "h-4 w-4",
                        message.senderType === 'ai' ? "text-accent" : "text-primary"
                      )} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                      message.senderType === 'customer'
                        ? "bg-primary text-primary-foreground"
                        : message.senderType === 'ai'
                        ? "bg-accent/5 border border-accent/20"
                        : "bg-muted"
                    )}
                  >
                    {message.content && (
                      <div className="text-sm leading-relaxed">{renderFormattedContent(message.content)}</div>
                    )}
                    
                    {/* Display attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2">
                            {attachment.mimeType.startsWith('image/') ? (
                              <a
                                href={`/api/customer-chat/files/${attachment.filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={`/api/customer-chat/files/${attachment.filename}`}
                                  alt={attachment.originalName}
                                  className="max-w-full h-auto rounded-lg max-h-48"
                                />
                              </a>
                            ) : (
                              <a
                                href={`/api/customer-chat/files/${attachment.filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-black/10 dark:bg-white/10 rounded-lg hover-elevate"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{attachment.originalName}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.senderType === 'customer' && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* AI Typing Indicator */}
              {isAiResponding && (
                <div className="flex gap-3 justify-start" data-testid="ai-typing-indicator">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                  </div>
                  <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 bg-accent/5 border border-accent/20 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-3xl">
            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="ml-2 hover-elevate rounded-full p-0.5"
                        data-testid={`button-remove-file-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-1 sm:gap-2 items-end">
              {/* Action Buttons */}
              <div className="flex gap-0.5 sm:gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,application/pdf,.txt,.docx"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleCameraCapture}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  data-testid="button-attach-file"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={openCamera}
                  title="Take picture"
                  data-testid="button-camera"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                
                <div className="relative">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Add emoji"
                    data-testid="button-emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>
                
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleVoiceRecognition}
                  className={cn(isRecording && "bg-red-500 text-white hover:bg-red-600")}
                  title={isRecording ? "Stop recording" : "Voice to text"}
                  data-testid="button-voice"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 relative">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskQuestion();
                    }
                  }}
                  placeholder="Type message..."
                  className="pr-3 sm:pr-12"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
              </div>
              <Button
                onClick={handleAskQuestion}
                disabled={(!question.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending}
                size="icon"
                className="rounded-xl"
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hero/Landing View
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Top Bar with Language Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher onLanguageChange={handleLanguageChange} />
        <NotificationBell sessionId={chatState.sessionId} />
        <ThemeToggle />
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header with white-label branding support */}
          <div className="text-center mb-12">
            {/* Organization logo or default icon */}
            {branding?.logo ? (
              <img 
                src={branding.logo} 
                alt={branding.name} 
                className="w-16 h-16 rounded-2xl object-contain mx-auto mb-6 shadow-sm"
                data-testid="img-org-logo-hero"
              />
            ) : (
              <div 
                className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6"
                style={branding?.primaryColor ? { backgroundColor: `${branding.primaryColor}1A` } : undefined}
              >
                <Sparkles 
                  className="h-8 w-8 text-primary" 
                  style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}
                />
              </div>
            )}
            <h1 
              className="text-display mb-4" 
              data-testid="title-hero"
              style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}
            >
              {branding?.name ? `${branding.name} Support` : t('chat.welcomeTitle')}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {branding?.welcomeMessage || t('chat.welcomeSubtitle')}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/knowledge-base'}
                className="text-sm text-muted-foreground hover:text-foreground gap-2"
                data-testid="link-knowledge-base"
              >
                <FileText className="h-4 w-4" />
                {t('chat.browseKnowledgeBase')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/portal/login'}
                className="text-sm text-muted-foreground hover:text-foreground gap-2"
                data-testid="link-portal-login"
              >
                <LogIn className="h-4 w-4" />
                {t('nav.customerPortal')}
              </Button>
            </div>
          </div>

          {/* Continue Conversation Card - Shows when user has existing conversation */}
          {(chatState.conversationId || existingConversation?.conversationId) && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t('chat.continueConversation')}</h3>
                    {(chatState.customerInfo || existingConversation?.customerInfo) && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('chat.welcomeBack')}, {chatState.customerInfo?.name || existingConversation?.customerInfo?.name}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={() => setChatStarted(true)}
                        data-testid="button-continue-conversation"
                      >
                        {t('chat.openChat')}
                      </Button>
                      <Button 
                        onClick={() => {
                          // Clear localStorage and reset state to start fresh
                          localStorage.removeItem('customer-chat-state');
                          setChatState({
                            conversationId: null,
                            customerId: null,
                            sessionId: crypto.randomUUID(),
                            customerInfo: null,
                            selectedCategory: null,
                          });
                          setShowCategoryDialog(false);
                          setQuestion("");
                          setSelectedFiles([]);
                        }}
                        variant="outline"
                        data-testid="button-new-conversation"
                      >
                        {t('chat.startNewChat')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Input */}
          <Card className="mb-8 shadow-lg border-0 bg-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskQuestion();
                      }
                    }}
                    placeholder={t('chat.inputPlaceholder')}
                    className="pl-12 pr-4 h-14 text-base rounded-xl border-2 focus:border-primary transition-colors"
                    data-testid="input-hero-question"
                  />
                </div>
                <Button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || sendMessageMutation.isPending || createCustomerMutation.isPending}
                  className="w-full rounded-xl h-12 text-base font-medium gap-2"
                  data-testid="button-ask-question"
                >
                  {sendMessageMutation.isPending || createCustomerMutation.isPending ? (
                    t('chat.sending')
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('chat.getHelp')}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <div className="px-4">
            <p className="text-center text-sm text-muted-foreground mb-4">{t('chat.popularQuestions')}</p>
            <div className="flex flex-col gap-2 items-center">
              {suggestedQuestions.map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="text-sm rounded-full max-w-full text-left whitespace-normal h-auto py-2 px-4"
                  data-testid={`button-suggested-${idx}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-headline">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <span>{t('categories.title')}</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              {t('categories.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {SUPPORT_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className="flex flex-col items-center p-5 rounded-xl border border-border hover-elevate active-elevate-2 transition-all text-center group"
                  data-testid={`button-category-${category.id}`}
                >
                  <div className={cn(
                    "p-3 rounded-xl mb-3 transition-transform group-hover:scale-110",
                    category.color.replace('text-', 'bg-').replace('-500', '-100')
                  )}>
                    <Icon className={cn("h-6 w-6", category.color)} />
                  </div>
                  <span className="font-semibold text-sm mb-1">
                    {getCategoryTranslation(t, category.id, 'name') || category.label}
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {getCategoryTranslation(t, category.id, 'description') || category.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCategoryDialog(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-headline">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <span>{t('customerInfo.title')}</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              {t('customerInfo.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            {chatState.selectedCategory && (() => {
              const cat = getSelectedCategoryInfo();
              if (!cat) return null;
              const Icon = cat.icon;
              return (
                <>
                  <div className={cn(
                    "p-2 rounded-lg",
                    cat.color.replace('text-', 'bg-').replace('-500', '-100')
                  )}>
                    <Icon className={cn("h-4 w-4", cat.color)} />
                  </div>
                  <span className="text-sm font-medium">
                    {getCategoryTranslation(t, cat.id, 'name') || cat.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCategories}
                    className="ml-auto text-xs"
                  >
                    {t('common.change')}
                  </Button>
                </>
              );
            })()}
          </div>
          <CustomerInfoForm
            onSubmit={handleCustomerInfoSubmit}
            onCancel={() => setShowInfoDialog(false)}
            isLoading={createCustomerMutation.isPending}
            bare
          />
        </DialogContent>
      </Dialog>

      {/* Conversation Rating Dialog */}
      {chatState.conversationId && (
        <ConversationRatingDialog
          conversationId={chatState.conversationId}
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          onSubmit={() => {
            // Rating submitted successfully
            setShowRatingDialog(false);
            ratingCheckDone.current = false; // Reset to allow rating again if needed
          }}
        />
      )}
    </div>
  );
}
