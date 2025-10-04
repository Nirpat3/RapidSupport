import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Send, 
  Sparkles, 
  MessageCircle, 
  Clock,
  Shield,
  Zap,
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
  MessageSquarePlus
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { CustomerInfoForm } from "@/components/CustomerInfoForm";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { AnonymousCustomer } from "@shared/schema";

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
  conversationId: string | null;
  customerId: string | null;
  sessionId: string;
  customerInfo: AnonymousCustomer | null;
}

export default function CustomerChatPage() {
  const [question, setQuestion] = useState("");
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // File upload, emoji, camera, voice states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

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
    };
  });

  // Initialize chatStarted based on whether we have a saved conversation
  const [chatStarted, setChatStarted] = useState(() => {
    const savedState = localStorage.getItem('customer-chat-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return !!parsed.conversationId;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('customer-chat-state', JSON.stringify(chatState));
  }, [chatState]);

  // Check for existing conversation
  const { data: existingConversation } = useQuery<ExistingConversationResponse | null>({
    queryKey: ['/api/customer-chat/check-session', chatState.sessionId],
    enabled: !chatState.conversationId,
  });

  // Fetch messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/customer-chat/messages', chatState.conversationId],
    enabled: !!chatState.conversationId,
    refetchInterval: chatStarted ? 3000 : false,
  });

  // Create customer and conversation
  const createCustomerMutation = useMutation<CreateCustomerResponse, Error, AnonymousCustomer>({
    mutationFn: async (customerData: AnonymousCustomer) => {
      const response = await apiRequest('/api/customer-chat/create-customer', 'POST', {
        ...customerData,
        ipAddress: '',
        sessionId: chatState.sessionId,
      });
      return response;
    },
    onSuccess: async (response) => {
      setChatState({
        conversationId: response.conversationId,
        customerId: response.customerId,
        sessionId: chatState.sessionId,
        customerInfo: response.customerInfo,
      });
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
      return await apiRequest('/api/customer-chat/send-message', 'POST', {
        conversationId: convId,
        content,
        customerId: custId,
      });
    },
    onSuccess: () => {
      setQuestion("");
      refetchMessages();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatStarted]);

  // Check if returning customer (from API)
  useEffect(() => {
    if (existingConversation?.conversationId && !chatState.conversationId) {
      setChatState({
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        sessionId: chatState.sessionId,
        customerInfo: existingConversation.customerInfo,
      });
      setChatStarted(true);
    }
  }, [existingConversation]);

  // Check if returning customer (from localStorage on mount)
  useEffect(() => {
    if (chatState.conversationId) {
      setChatStarted(true);
    }
  }, []);

  const handleAskQuestion = async () => {
    if (!question.trim() && selectedFiles.length === 0) return;

    // If already has conversation, just send message
    if (chatState.conversationId) {
      const messageContent = question.trim() || (selectedFiles.length > 0 ? '[Attachment]' : '');
      const response = await sendMessageMutation.mutateAsync({ content: messageContent });
      if (selectedFiles.length > 0 && response?.id) {
        await uploadFiles(response.id);
      }
      setChatStarted(true);
      return;
    }

    // If has existing session, resume it
    if (existingConversation?.conversationId) {
      setChatState({
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
        sessionId: chatState.sessionId,
        customerInfo: existingConversation.customerInfo,
      });
      setChatStarted(true);
      // Use IDs from existingConversation to avoid state race
      const messageContent = question.trim() || (selectedFiles.length > 0 ? '[Attachment]' : '');
      const response = await sendMessageMutation.mutateAsync({ 
        content: messageContent,
        conversationId: existingConversation.conversationId,
        customerId: existingConversation.customerId,
      });
      if (selectedFiles.length > 0 && response?.id) {
        await uploadFiles(response.id);
      }
      return;
    }

    // New customer - show info dialog and store pending message and files
    setPendingMessage(question);
    setPendingFiles(selectedFiles);
    setShowInfoDialog(true);
  };

  const handleCustomerInfoSubmit = async (customerData: AnonymousCustomer) => {
    await createCustomerMutation.mutateAsync(customerData);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
  };

  // Open camera using MediaDevices API (works on all devices)
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use rear camera on mobile
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Capture photo from camera stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob then to file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFiles(prev => [...prev, file].slice(0, 5));
        closeCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Close camera and cleanup
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
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

  // Voice-to-text handler
  const toggleVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
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
    });
    setChatStarted(false);
    setQuestion('');
    setSelectedFiles([]);
  };

  const suggestedQuestions = [
    "How do I reset my password?",
    "What are your pricing plans?",
    "How can I upgrade my account?",
    "I need help with billing",
  ];

  // If chat has started, show the chat interface
  if (chatStarted && chatState.conversationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold" data-testid="title-support-chat">Support Chat</h1>
                  {chatState.customerInfo && (
                    <p className="text-xs text-muted-foreground">{chatState.customerInfo.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewConversation}
                  className="gap-2"
                  data-testid="button-new-conversation"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  New Chat
                </Button>
                <Badge variant="secondary" className="gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online
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
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3",
                      message.senderType === 'customer'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card sticky bottom-0">
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
            
            <div className="flex gap-2 items-end">
              {/* Action Buttons */}
              <div className="flex gap-1">
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
                  placeholder="Type your message..."
                  className="pr-12 min-h-[48px] resize-none"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
              </div>
              <Button
                onClick={handleAskQuestion}
                disabled={(!question.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending}
                size="icon"
                className="h-12 w-12 rounded-xl"
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 bg-primary/10 rounded-2xl items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent" data-testid="title-hero">
              How can we help you today?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant answers from our AI-powered support or connect with our team
            </p>
          </div>

          {/* Search Input */}
          <div className="mb-8">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                placeholder="Ask a question or describe your issue..."
                className="pl-12 pr-28 sm:pr-32 h-14 text-base rounded-2xl shadow-lg border-2 focus-visible:ring-2"
                data-testid="input-hero-question"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || sendMessageMutation.isPending || createCustomerMutation.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 min-w-[80px] sm:min-w-[90px]"
                data-testid="button-ask-question"
              >
                {sendMessageMutation.isPending || createCustomerMutation.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    Ask <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="mb-16">
            <p className="text-sm text-muted-foreground mb-4 text-center">Popular questions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="rounded-full hover-elevate"
                  data-testid={`button-suggested-${idx}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Instant Answers</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered responses in seconds, 24/7
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and protected
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast Response</h3>
                <p className="text-sm text-muted-foreground">
                  Average response time under 2 minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Support Online
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>Available 24/7</span>
              <Separator orientation="vertical" className="h-4" />
              <span>No account required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Just a few details
            </DialogTitle>
            <DialogDescription>
              Help us provide better support by sharing your contact information
            </DialogDescription>
          </DialogHeader>
          <CustomerInfoForm
            onSubmit={handleCustomerInfoSubmit}
            onCancel={() => setShowInfoDialog(false)}
            isLoading={createCustomerMutation.isPending}
            bare
          />
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take a Photo
            </DialogTitle>
            <DialogDescription>
              Position your camera and click capture when ready
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
                data-testid="video-camera-preview"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={closeCamera}
                data-testid="button-camera-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={capturePhoto}
                data-testid="button-camera-capture"
              >
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
