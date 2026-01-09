import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, MessageSquare, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioBase64?: string;
  knowledgeLinks?: Array<{ id: string; title: string }>;
}

interface VoiceConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  onMessageSaved?: () => void;
}

const LANGUAGES = [
  { code: 'en-US', name: 'English', aiCode: 'en' },
  { code: 'es-ES', name: 'Spanish', aiCode: 'es' },
  { code: 'fr-FR', name: 'French', aiCode: 'fr' },
  { code: 'de-DE', name: 'German', aiCode: 'de' },
  { code: 'zh-CN', name: 'Chinese', aiCode: 'zh' },
  { code: 'hi-IN', name: 'Hindi', aiCode: 'hi' },
];

export default function VoiceConversationDialog({
  open,
  onOpenChange,
  conversationId,
  onMessageSaved
}: VoiceConversationDialogProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [audioMuted, setAudioMuted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const voiceChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const selectedLang = LANGUAGES.find(l => l.code === language);
      return apiRequest('/api/voice/chat', 'POST', {
        message,
        conversationHistory: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        language: selectedLang?.aiCode || 'en',
        conversationId
      });
    },
    onSuccess: (data) => {
      const aiMessage: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        audioBase64: data.audio,
        knowledgeLinks: data.knowledgeLinks
      };
      setMessages(prev => [...prev, aiMessage]);
      
      if (data.audio && !audioMuted) {
        playAudio(data.audio);
      }
      
      onMessageSaved?.();
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Voice chat error:', error);
      setIsProcessing(false);
    }
  });

  const playAudio = useCallback((base64Audio: string) => {
    try {
      setIsSpeaking(true);
      const audioData = `data:audio/mp3;base64,${base64Audio}`;
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioData);
      audioRef.current = audio;
      
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      audio.play().catch(err => {
        console.error('Audio playback error:', err);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    
    if (transcript.trim()) {
      const userMessage: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: transcript,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setIsProcessing(true);
      voiceChatMutation.mutate(transcript);
      setTranscript('');
    }
  }, [transcript, voiceChatMutation]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const replayAudio = useCallback((audioBase64?: string) => {
    if (audioBase64 && !audioMuted) {
      playAudio(audioBase64);
    }
  }, [audioMuted, playAudio]);

  useEffect(() => {
    if (!open) {
      stopAudio();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setTranscript('');
    }
  }, [open, stopAudio]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Voice Conversation
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAudioMuted(!audioMuted)}
              >
                {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <Mic className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Start a voice conversation</p>
                <p className="text-sm">Click the microphone button below and speak</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                  <CardContent className="p-3">
                    <p className="text-sm">{message.content}</p>
                    
                    {message.knowledgeLinks && message.knowledgeLinks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs opacity-70 mb-1">Related Resources:</p>
                        {message.knowledgeLinks.map(link => (
                          <a
                            key={link.id}
                            href={`/kb/${link.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline opacity-80 hover:opacity-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.title}
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {message.role === 'assistant' && message.audioBase64 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 px-2 text-xs"
                        onClick={() => replayAudio(message.audioBase64)}
                        disabled={audioMuted}
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        Replay
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

            {(isListening || transcript) && (
              <div className="flex justify-end">
                <Card className="max-w-[80%] bg-primary/10 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-sm italic">{transcript || 'Listening...'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {isProcessing && (
              <div className="flex justify-start">
                <Card className="max-w-[80%]">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex flex-col items-center gap-3">
            {isSpeaking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-1 h-5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                </div>
                <span>AI is speaking...</span>
                <Button variant="ghost" size="sm" onClick={stopAudio}>
                  Stop
                </Button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className={`rounded-full w-16 h-16 ${isListening ? 'animate-pulse' : ''}`}
                onClick={toggleListening}
                disabled={isProcessing || isSpeaking}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {isListening 
                ? 'Listening... Click to stop and send' 
                : isProcessing 
                  ? 'Processing your message...'
                  : 'Click microphone to start speaking'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
