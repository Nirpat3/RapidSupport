import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/hooks/customer-chat";
import { getCategoryTranslation } from "@/hooks/customer-chat";

interface CategorySelectionGridProps {
  categories: CategoryOption[];
  onSelect: (categoryId: string) => void;
}

export function CategorySelectionGrid({
  categories,
  onSelect,
}: CategorySelectionGridProps) {
  const { t } = useTranslation();

  return (
    <Card className="mb-8 shadow-lg border-0 bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold mb-2">{t('categories.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('categories.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => {
            const IconComponent = category.icon;
            const translatedName = getCategoryTranslation(t, category.id, 'name');
            const translatedDesc = getCategoryTranslation(t, category.id, 'description');
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 sm:p-6",
                  "rounded-xl border-2 border-border/50",
                  "hover-elevate active-elevate-2",
                  "transition-all duration-200",
                  "text-center group"
                )}
                data-testid={`category-${category.id}`}
              >
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3",
                  "bg-primary/10 group-hover:bg-primary/20 transition-colors"
                )}>
                  <IconComponent className={cn("h-5 w-5 sm:h-6 sm:w-6", category.color)} />
                </div>
                <span className="font-medium text-sm sm:text-base">
                  {translatedName || category.label}
                </span>
                <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {translatedDesc || category.description}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
