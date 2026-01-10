import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  Send, 
  Paperclip, 
  Camera, 
  Smile, 
  Mic, 
  X, 
  Image as ImageIcon,
  FileText 
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import type { CategoryOption } from "@/hooks/customer-chat";

interface ReadyStateComposerProps {
  question: string;
  setQuestion: (value: string) => void;
  selectedCategory: CategoryOption | null;
  selectedFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCameraCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onOpenCamera: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onEmojiClick: (data: EmojiClickData) => void;
  isRecording: boolean;
  onToggleVoice: () => void;
  onSend: () => void;
  isLoading?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
}

export function ReadyStateComposer({
  question,
  setQuestion,
  selectedCategory,
  selectedFiles,
  onFileSelect,
  onCameraCapture,
  onRemoveFile,
  onOpenCamera,
  showEmojiPicker,
  setShowEmojiPicker,
  onEmojiClick,
  isRecording,
  onToggleVoice,
  onSend,
  isLoading = false,
  fileInputRef,
  cameraInputRef,
}: ReadyStateComposerProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-card">
      <CardContent className="p-4">
        {selectedCategory && (
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="gap-1">
              {(() => {
                const IconComponent = selectedCategory.icon;
                return <><IconComponent className="h-3 w-3" /> {selectedCategory.label}</>;
              })()}
            </Badge>
          </div>
        )}
        
        {selectedFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md text-sm"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate max-w-[120px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onRemoveFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.typeMessage')}
            className="min-h-[100px] resize-none pr-12 text-base"
            data-testid="input-hero-question"
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={onCameraCapture}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title={t('chat.attachFile')}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenCamera}
              title={t('chat.takePhoto')}
            >
              <Camera className="h-4 w-4" />
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title={t('chat.emoji')}
              >
                <Smile className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-10 right-0 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVoice}
              className={cn(isRecording && "text-destructive")}
              title={t('chat.voiceInput')}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end mt-3">
          <Button
            onClick={onSend}
            disabled={(!question.trim() && selectedFiles.length === 0) || isLoading}
            data-testid="button-ask-question"
          >
            <Send className="h-4 w-4 mr-2" />
            {t('chat.send')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
