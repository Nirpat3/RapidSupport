import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ArrowRight, Paperclip, Camera, Smile, Mic } from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ExistingConversationCardProps {
  customerName?: string;
  onContinue: () => void;
  onStartNew: () => void;
  onQuickMessage?: (message: string) => void;
  onAttachFile?: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  isLoading?: boolean;
  voiceEnabled?: boolean;
}

export function ExistingConversationCard({
  customerName,
  onContinue,
  onStartNew,
  onQuickMessage,
  onAttachFile,
  onCamera,
  onVoice,
  isLoading = false,
  voiceEnabled = false,
}: ExistingConversationCardProps) {
  const { t } = useTranslation();
  const [quickMessage, setQuickMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleQuickSend = () => {
    if (quickMessage.trim() && onQuickMessage) {
      onQuickMessage(quickMessage.trim());
      setQuickMessage("");
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setQuickMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <Card className="mb-8 shadow-lg border-0 bg-card">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{t('chat.continueConversation')}</h3>
            {customerName && (
              <p className="text-sm text-muted-foreground mb-4">
                {t('chat.welcomeBack')}, {customerName}
              </p>
            )}
            
            {onQuickMessage && (
              <div className="mb-4">
                <div className="flex flex-col gap-2 border rounded-xl p-3 bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <Textarea
                    value={quickMessage}
                    onChange={(e) => {
                      setQuickMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuickSend();
                      }
                    }}
                    placeholder={t('chat.inputPlaceholder')}
                    className="min-h-[24px] max-h-[120px] resize-none border-0 focus-visible:ring-0 text-base p-0"
                    style={{ height: '24px' }}
                    data-testid="input-quick-message"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex gap-1">
                      {onAttachFile && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={onAttachFile}
                          title="Attach file"
                          data-testid="button-quick-attach"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {onCamera && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={onCamera}
                          title="Take picture"
                          data-testid="button-quick-camera"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="relative">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          title="Add emoji"
                          data-testid="button-quick-emoji"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 left-0 z-50">
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                          </div>
                        )}
                      </div>
                      
                      {voiceEnabled && onVoice && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={onVoice}
                          title="Start voice conversation"
                          data-testid="button-quick-voice"
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleQuickSend}
                      disabled={!quickMessage.trim() || isLoading}
                      size="sm"
                      className="rounded-lg gap-1.5"
                      data-testid="button-quick-send"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t('chat.send')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={onContinue}
                variant="outline"
                className="gap-1.5"
                data-testid="button-continue-conversation"
              >
                {t('chat.openChat')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={onStartNew}
                variant="ghost"
                data-testid="button-new-conversation"
              >
                {t('chat.startNewChat')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
