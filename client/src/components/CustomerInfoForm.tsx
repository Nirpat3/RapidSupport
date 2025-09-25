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
}

export function CustomerInfoForm({
  onSubmit,
  onCancel,
  isLoading = false,
  title = "Let's get started",
  description = "Please provide your information so we can assist you better."
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

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-customer-info">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="title-customer-info">
          <User className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground" data-testid="text-description">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Name *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              data-testid="input-name"
              {...form.register("name")}
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive" data-testid="error-name">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Business Name Field */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Name *
            </Label>
            <Input
              id="company"
              type="text"
              placeholder="Enter your business name"
              data-testid="input-company"
              {...form.register("company")}
              disabled={isLoading}
            />
            {form.formState.errors.company && (
              <p className="text-sm text-destructive" data-testid="error-company">
                {form.formState.errors.company.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              data-testid="input-email"
              {...form.register("email")}
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive" data-testid="error-email">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              data-testid="input-phone"
              {...form.register("phone")}
              disabled={isLoading}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive" data-testid="error-phone">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md" data-testid="text-privacy">
            <p>
              Your information will be used to provide customer support and track your conversation history. 
              We respect your privacy and will not share your information with third parties.
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
              {isLoading ? "Starting Chat..." : "Start Chat"}
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
      </CardContent>
    </Card>
  );
}