import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

interface ExistingConversationCardProps {
  customerName?: string;
  onContinue: () => void;
  onStartNew: () => void;
}

export function ExistingConversationCard({
  customerName,
  onContinue,
  onStartNew,
}: ExistingConversationCardProps) {
  const { t } = useTranslation();

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
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={onContinue}
                data-testid="button-continue-conversation"
              >
                {t('chat.openChat')}
              </Button>
              <Button 
                onClick={onStartNew}
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
  );
}
