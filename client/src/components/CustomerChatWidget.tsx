import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Minimize2, Maximize2, Paperclip } from "lucide-react";
import { CustomerInfoForm } from "./CustomerInfoForm";
import { EmojiPicker } from "./EmojiPicker";
import { MessageAttachments, type MessageAttachment } from "./MessageAttachments";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { AnonymousCustomer } from "@shared/schema";

interface ChatMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent';
  senderName: string;
  timestamp: string;
}

interface ExistingConversationResponse {
  conversationId: string;
  customerId: string;
  customerInfo: AnonymousCustomer;
}

interface CreateCustomerResponse {
  customerId: string;
  conversationId: string;
  customerInfo: AnonymousCustomer;
}

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  showInfoForm: boolean;
  conversationId: string | null;
  customerId: string | null;
  sessionId: string;
  customerInfo: AnonymousCustomer | null;
}

export function CustomerChatWidget() {
  // Initialize chat state with localStorage persistence
  const [chatState, setChatState] = useState<ChatState>(() => {
    const savedState = localStorage.getItem('customer-chat-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return {
          isOpen: false,
          isMinimized: false,
          showInfoForm: false,
          conversationId: parsed.conversationId || null,
          customerId: parsed.customerId || null,
          sessionId: parsed.sessionId || crypto.randomUUID(),
          customerInfo: parsed.customerInfo || null,
        };
      } catch (e) {
        console.error('Failed to parse saved chat state:', e);
      }
    }
    return {
      isOpen: false,
      isMinimized: false,
      showInfoForm: false,
      conversationId: null,
      customerId: null,
      sessionId: crypto.randomUUID(),
      customerInfo: null,
    };
  });

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      conversationId: chatState.conversationId,
      customerId: chatState.customerId,
      sessionId: chatState.sessionId,
      customerInfo: chatState.customerInfo,
    };
    localStorage.setItem('customer-chat-state', JSON.stringify(stateToSave));
  }, [chatState.conversationId, chatState.customerId, chatState.sessionId, chatState.customerInfo]);

  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // IP address will be determined server-side for security
  const getClientIP = async (): Promise<string> => {
    // Server will determine IP address from request
    return '';
  };

  // Check for existing conversation based on session/IP
  const { data: existingConversation, refetch: checkExistingConversation } = useQuery<ExistingConversationResponse | null>({
    queryKey: ['/api/customer-chat/check-session', chatState.sessionId],
    enabled: chatState.isOpen && !chatState.conversationId,
  });

  // Fetch messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/customer-chat/messages', chatState.conversationId],
    enabled: !!chatState.conversationId,
    refetchInterval: 2000, // Poll for new messages every 2 seconds
  });

  // Create customer and conversation
  const createCustomerMutation = useMutation<CreateCustomerResponse, Error, AnonymousCustomer>({
    mutationFn: async (customerData: AnonymousCustomer) => {
      const ipAddress = await getClientIP();
      const requestData = {
        ...customerData,
        ipAddress,
        sessionId: chatState.sessionId,
      };
      const response = await apiRequest('POST', '/api/customer-chat/create-customer', requestData);
      return response;
    },
    onSuccess: (response) => {
      setChatState(prev => ({
        ...prev,
        showInfoForm: false,
        customerId: response.customerId,
        conversationId: response.conversationId,
        customerInfo: response.customerInfo,
      }));
      refetchMessages();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('Attempting to send message. Chat state:', chatState);
      if (!chatState.conversationId) {
        console.error('No active conversation! Chat state:', chatState);
        throw new Error("No active conversation");
      }
      console.log('Sending message:', { conversationId: chatState.conversationId, content, customerId: chatState.customerId });
      return await apiRequest('POST', '/api/customer-chat/send-message', {
        conversationId: chatState.conversationId,
        content,
        customerId: chatState.customerId,
      });
    },
    onSuccess: () => {
      console.log('Message sent successfully');
      setMessageInput("");
      setSelectedFiles([]);
      refetchMessages();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenChat = () => {
    setChatState(prev => ({ ...prev, isOpen: true }));
    checkExistingConversation();
  };

  const handleCloseChat = () => {
    setChatState(prev => ({ 
      ...prev, 
      isOpen: false, 
      isMinimized: false 
    }));
  };

  const handleMinimize = () => {
    setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  const handleStartChat = () => {
    if (existingConversation?.conversationId) {
      // Resume existing conversation
      setChatState(prev => ({
        ...prev,
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        customerInfo: existingConversation.customerInfo,
        showInfoForm: false,
      }));
    } else {
      // Show customer info form
      setChatState(prev => ({ ...prev, showInfoForm: true }));
    }
  };

  const handleCustomerInfoSubmit = async (customerData: AnonymousCustomer) => {
    await createCustomerMutation.mutateAsync(customerData);
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called with messageInput:', messageInput);
    console.log('Current chat state:', chatState);
    
    if (!messageInput.trim()) {
      console.log('Empty message, returning');
      return;
    }
    
    if (!chatState.conversationId) {
      console.log('No conversation ID, starting chat');
      handleStartChat();
      return;
    }

    console.log('Calling sendMessageMutation with:', messageInput);
    await sendMessageMutation.mutateAsync(messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  // Chat widget button when closed
  if (!chatState.isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleOpenChat}
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6 mr-2" />
          Chat with us
        </Button>
      </div>
    );
  }

  // Chat widget content
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-96 h-[32rem] bg-background border rounded-lg shadow-xl",
      "flex flex-col transition-all duration-200",
      chatState.isMinimized && "h-14"
    )} data-testid="widget-chat">
      
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-sm font-medium" data-testid="title-chat-header">
          Customer Support
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-minimize"
          >
            {chatState.isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseChat}
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!chatState.isMinimized && (
        <>
          {/* Content */}
          <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
            {chatState.showInfoForm ? (
              <CustomerInfoForm
                onSubmit={handleCustomerInfoSubmit}
                onCancel={() => setChatState(prev => ({ ...prev, showInfoForm: false }))}
                isLoading={createCustomerMutation.isPending}
                title="Start a conversation"
                description="Please provide your details to get personalized support."
              />
            ) : chatState.conversationId ? (
              <>
                {/* Customer Info Display */}
                {chatState.customerInfo && (
                  <div className="mb-4 p-3 bg-muted rounded-md" data-testid="display-customer-info">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {chatState.customerInfo.company}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {chatState.customerInfo.name} • {chatState.customerInfo.email}
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4" data-testid="messages-container">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.senderType === 'customer' ? "justify-end" : "justify-start"
                      )}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          message.senderType === 'customer'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {message.senderName}
                          </span>
                          <Badge variant={message.senderType === 'agent' ? 'secondary' : 'outline'} className="text-xs">
                            {message.senderType}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          {/* TODO: Add attachment display when message attachments are loaded */}
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              /* Welcome Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4" data-testid="welcome-screen">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-2">Welcome to Support Chat</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get instant help from our support team. Start a conversation to get assistance.
                  </p>
                  <Button onClick={handleStartChat} data-testid="button-start-chat">
                    Start Conversation
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer - Message Input */}
          {chatState.conversationId && (
            <CardFooter className="p-4 pt-0">
              <div className="space-y-3">
                {/* Selected Files Display */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded border">
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4" />
                          <span className="truncate">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024).toFixed(1)}KB
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Input */}
                <div className="flex w-full gap-2">
                  <div className="flex gap-1">
                    {/* File Upload Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sendMessageMutation.isPending}
                      className="h-9 w-9"
                      data-testid="button-file-upload"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    {/* Emoji Picker */}
                    <EmojiPicker
                      onEmojiSelect={handleEmojiSelect}
                      disabled={sendMessageMutation.isPending}
                    />
                  </div>

                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-customer-message"
                    className="flex-1"
                  />
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    size="icon"
                    data-testid="button-send-customer-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </div>
            </CardFooter>
          )}
        </>
      )}
    </div>
  );
}