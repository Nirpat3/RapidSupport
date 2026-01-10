import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { CustomerInfoForm } from "@/components/CustomerInfoForm";
import type { CategoryOption } from "@/hooks/customer-chat";
import type { AnonymousCustomer } from "@shared/schema";

interface ContactInfoStepProps {
  selectedCategory: CategoryOption | null;
  onSubmit: (data: AnonymousCustomer) => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function ContactInfoStep({
  selectedCategory,
  onSubmit,
  onBack,
  isSubmitting = false,
}: ContactInfoStepProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-8 shadow-lg border-0 bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{t('chat.contactInfo')}</h2>
            <p className="text-sm text-muted-foreground">{t('chat.contactInfoDesc')}</p>
          </div>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              {(() => {
                const IconComponent = selectedCategory.icon;
                return <><IconComponent className="h-3 w-3" /> {selectedCategory.label}</>;
              })()}
            </Badge>
          )}
        </div>
        <CustomerInfoForm 
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
        <Button
          variant="ghost"
          onClick={onBack}
          className="mt-4 w-full"
        >
          <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
          {t('common.back')}
        </Button>
      </CardContent>
    </Card>
  );
}
