import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff, Volume2, VolumeX, Loader2, ExternalLink, Hand, Radio, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { correctTranscript, initializeDomainVocabulary } from "@/lib/domainVocabulary";

type VoiceMode = 'pushToTalk' | 'continuous';

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
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => {
    const saved = localStorage.getItem('voiceMode');
    return (saved === 'pushToTalk' || saved === 'continuous') ? saved : 'pushToTalk';
  });
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [lastCorrections, setLastCorrections] = useState<Array<{ original: string; corrected: string }>>([]);
  const [vocabularyLoaded, setVocabularyLoaded] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimestampRef = useRef<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    localStorage.setItem('voiceMode', voiceMode);
  }, [voiceMode]);

  useEffect(() => {
    if (open && !vocabularyLoaded) {
      initializeDomainVocabulary().then(() => {
        setVocabularyLoaded(true);
      });
    }
  }, [open, vocabularyLoaded]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

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

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const { corrected, corrections } = correctTranscript(text.trim());
    
    if (corrections.length > 0) {
      console.log('[Voice] Applied corrections:', corrections);
      setLastCorrections(corrections);
    } else {
      setLastCorrections([]);
    }
    
    const userMessage: VoiceMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: corrected,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    voiceChatMutation.mutate(corrected);
    setTranscript('');
    accumulatedTranscriptRef.current = '';
  }, [voiceChatMutation]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Use continuous mode for both - we'll handle the stopping manually
    // Non-continuous mode on iOS Safari doesn't process results reliably
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('[Voice] Recognition started, mode:', voiceMode);
      setIsListening(true);
      setTranscript('');
      accumulatedTranscriptRef.current = '';
      lastSpeechTimestampRef.current = Date.now();
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
      
      console.log('[Voice] Result - final:', finalTranscript, 'interim:', interimTranscript);
      
      if (finalTranscript) {
        accumulatedTranscriptRef.current += ' ' + finalTranscript;
        accumulatedTranscriptRef.current = accumulatedTranscriptRef.current.trim();
      }
      
      const displayText = accumulatedTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
      setTranscript(displayText.trim());
      console.log('[Voice] Display text:', displayText.trim());
      
      lastSpeechTimestampRef.current = Date.now();
      
      if (voiceMode === 'continuous') {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (accumulatedTranscriptRef.current.trim()) {
            sendMessage(accumulatedTranscriptRef.current);
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }
        }, 2500);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      clearTimers();
    };

    recognition.onend = () => {
      console.log('[Voice] Recognition ended naturally');
      setIsListening(false);
      clearTimers();
      setIsPushToTalkActive(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, voiceMode, sendMessage, clearTimers]);

  const stopListening = useCallback((shouldSend: boolean = true) => {
    clearTimers();
    
    // Capture the text before stopping recognition
    const textToSend = accumulatedTranscriptRef.current.trim() || transcript.trim();
    console.log('[Voice] stopListening called, shouldSend:', shouldSend, 'text:', textToSend);
    
    if (recognitionRef.current) {
      try {
        // Use abort() for cleaner stop on iOS Safari to prevent freezes
        if (voiceMode === 'pushToTalk' && recognitionRef.current.abort) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.log('[Voice] Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsPushToTalkActive(false);
    
    if (shouldSend && textToSend) {
      sendMessage(textToSend);
    } else {
      setTranscript('');
      accumulatedTranscriptRef.current = '';
    }
  }, [sendMessage, clearTimers, transcript, voiceMode]);

  const toggleListening = useCallback(() => {
    if (voiceMode === 'continuous') {
      if (isListening) {
        stopListening(true);
      } else {
        startListening();
      }
    }
  }, [isListening, startListening, stopListening, voiceMode]);

  const handlePushToTalkStart = useCallback(() => {
    if (voiceMode !== 'pushToTalk' || isProcessing || isSpeaking) return;
    
    holdTimerRef.current = setTimeout(() => {
      setIsPushToTalkActive(true);
      startListening();
    }, 150);
  }, [voiceMode, isProcessing, isSpeaking, startListening]);

  const handlePushToTalkEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    // Always try to send if push-to-talk was active
    // Don't check isListening because recognition may have already ended
    if (isPushToTalkActive) {
      const textToSend = accumulatedTranscriptRef.current.trim() || transcript.trim();
      console.log('[Voice] Push-to-talk end, text to send:', textToSend);
      
      // Stop recognition if still running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('[Voice] Error aborting recognition:', e);
        }
        recognitionRef.current = null;
      }
      
      setIsListening(false);
      setIsPushToTalkActive(false);
      clearTimers();
      
      // Send the message if we have text
      if (textToSend) {
        sendMessage(textToSend);
      } else {
        setTranscript('');
        accumulatedTranscriptRef.current = '';
      }
    } else {
      setIsPushToTalkActive(false);
    }
  }, [isPushToTalkActive, transcript, sendMessage, clearTimers]);

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
      clearTimers();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setIsPushToTalkActive(false);
      setTranscript('');
      accumulatedTranscriptRef.current = '';
    }
  }, [open, stopAudio, clearTimers]);

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
            {messages.length === 0 && !isListening && !isPushToTalkActive && (
              <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                <Mic className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Start a voice conversation</p>
                <p className="text-sm">
                  {voiceMode === 'pushToTalk' 
                    ? 'Hold the button below and speak'
                    : 'Click to start - auto-sends after you stop speaking'}
                </p>
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
            <ToggleGroup
              type="single"
              value={voiceMode}
              onValueChange={(value) => value && setVoiceMode(value as VoiceMode)}
              className="bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem
                value="pushToTalk"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground px-3 gap-1.5 text-foreground"
              >
                <Hand className="w-4 h-4" />
                <span className="text-xs font-medium">Push to Talk</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="continuous"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground px-3 gap-1.5 text-foreground"
              >
                <Radio className="w-4 h-4" />
                <span className="text-xs font-medium">Continuous</span>
              </ToggleGroupItem>
            </ToggleGroup>

            {lastCorrections.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full cursor-help">
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-corrected {lastCorrections.length} term{lastCorrections.length > 1 ? 's' : ''}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-xs">Vocabulary corrections applied:</p>
                    {lastCorrections.map((c, i) => (
                      <p key={i} className="text-xs">
                        <span className="line-through opacity-60">{c.original}</span>
                        {' → '}
                        <span className="font-medium">{c.corrected}</span>
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

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
              {voiceMode === 'pushToTalk' ? (
                <Button
                  size="lg"
                  variant={isPushToTalkActive ? "destructive" : "default"}
                  className={cn(
                    "rounded-full w-20 h-20 transition-all select-none touch-none",
                    isPushToTalkActive && "scale-110 ring-4 ring-destructive/30"
                  )}
                  onMouseDown={handlePushToTalkStart}
                  onMouseUp={handlePushToTalkEnd}
                  onMouseLeave={handlePushToTalkEnd}
                  onTouchStart={handlePushToTalkStart}
                  onTouchEnd={handlePushToTalkEnd}
                  onTouchCancel={handlePushToTalkEnd}
                  disabled={isProcessing || isSpeaking}
                >
                  {isPushToTalkActive ? (
                    <div className="flex flex-col items-center gap-1">
                      <Mic className="w-6 h-6 animate-pulse" />
                      <span className="text-[10px]">Release</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Hand className="w-6 h-6" />
                      <span className="text-[10px]">Hold</span>
                    </div>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  className={cn(
                    "rounded-full w-20 h-20 transition-all",
                    isListening && "ring-4 ring-destructive/30 animate-pulse"
                  )}
                  onClick={toggleListening}
                  disabled={isProcessing || isSpeaking}
                >
                  {isListening ? (
                    <div className="flex flex-col items-center gap-1">
                      <MicOff className="w-6 h-6" />
                      <span className="text-[10px]">Stop</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Radio className="w-6 h-6" />
                      <span className="text-[10px]">Start</span>
                    </div>
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {voiceMode === 'pushToTalk' 
                ? isPushToTalkActive
                  ? 'Listening... Release to send'
                  : isProcessing 
                    ? 'Processing your message...'
                    : 'Hold the button and speak, release to send'
                : isListening 
                  ? 'Listening... Click to stop or wait for auto-send' 
                  : isProcessing 
                    ? 'Processing your message...'
                    : 'Click to start - auto-sends after silence'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
