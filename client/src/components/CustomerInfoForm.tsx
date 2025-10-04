import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Building2, Mail, Phone } from "lucide-react";
import { anonymousCustomerSchema, AnonymousCustomer } from "@shared/schema";

interface CustomerInfoFormProps {
  onSubmit: (data: AnonymousCustomer) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  bare?: boolean; // If true, don't wrap in Card (for use in dialogs)
}

export function CustomerInfoForm({
  onSubmit,
  onCancel,
  isLoading = false,
  title = "Let's get started",
  description = "Please provide your information so we can assist you better.",
  bare = false
}: CustomerInfoFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AnonymousCustomer>({
    resolver: zodResolver(anonymousCustomerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      ipAddress: "",
    },
  });

  const handleSubmit = async (data: AnonymousCustomer) => {
    try {
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit information");
    }
  };

  const formContent = (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Your Name *
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            className="pl-10"
            data-testid="input-name"
            {...form.register("name")}
            disabled={isLoading}
          />
        </div>
        {form.formState.errors.name && (
          <p className="text-sm text-destructive" data-testid="error-name">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address *
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="email"
            type="email"
            placeholder="john@company.com"
            className="pl-10"
            data-testid="input-email"
            {...form.register("email")}
            disabled={isLoading}
          />
        </div>
        {form.formState.errors.email && (
          <p className="text-sm text-destructive" data-testid="error-email">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Company Field */}
      <div className="space-y-2">
        <Label htmlFor="company" className="text-sm font-medium">
          Company Name *
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <Input
            id="company"
            type="text"
            placeholder="Acme Inc."
            className="pl-10"
            data-testid="input-company"
            {...form.register("company")}
            disabled={isLoading}
          />
        </div>
        {form.formState.errors.company && (
          <p className="text-sm text-destructive" data-testid="error-company">
            {form.formState.errors.company.message}
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number *
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Phone className="h-4 w-4" />
          </div>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            className="pl-10"
            data-testid="input-phone"
            {...form.register("phone")}
            disabled={isLoading}
          />
        </div>
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive" data-testid="error-phone">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg" data-testid="text-privacy">
        <p>
          We'll use this info to provide better support. Your privacy is protected.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
          data-testid="button-submit-info"
        >
          {isLoading ? "Starting Chat..." : "Continue"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (bare) {
    return <div className="w-full" data-testid="form-customer-info">{formContent}</div>;
  }

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-customer-info">
      {(title || description) && (
        <CardHeader>
          {title && (
            <CardTitle className="flex items-center gap-2" data-testid="title-customer-info">
              <User className="h-5 w-5" />
              {title}
            </CardTitle>
          )}
          {description && (
            <p className="text-sm text-muted-foreground" data-testid="text-description">
              {description}
            </p>
          )}
        </CardHeader>
      )}
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
