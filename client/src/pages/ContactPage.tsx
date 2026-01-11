import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NovaLogo } from "@/components/NovaLogo";
import { SEO, generateBreadcrumbSchema, generateFAQSchema } from "@/components/SEO";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  ExternalLink,
  Menu,
  X,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ContactPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "general",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const contactFaqs = [
    { question: "What is your response time?", answer: "We typically respond within 24 hours during business days." },
    { question: "Do you offer phone support?", answer: "Yes, phone support is available for Professional and Enterprise plans." },
    { question: "Can I schedule a demo?", answer: "Absolutely! Use the contact form to request a personalized demo." }
  ];
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [
      generateBreadcrumbSchema([
        { name: "Home", url: baseUrl },
        { name: "Contact", url: `${baseUrl}/contact` }
      ]),
      generateFAQSchema(contactFaqs)
    ]
  };

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/public/contact", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Message sent successfully",
        description: "We'll get back to you as soon as possible.",
      });
      setFormData({
        name: "",
        email: "",
        company: "",
        subject: "general",
        message: "",
      });
      setFormErrors({});
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "Please try again later.",
      });
    },
  });

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email address";
    if (!formData.subject) errors.subject = "Subject is required";
    if (!formData.message.trim()) errors.message = "Message is required";
    if (formData.message.trim().length < 10)
      errors.message = "Message must be at least 10 characters";
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    contactMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Nova AI - Get in Touch"
        description="Contact Nova AI for help, sales inquiries, or support. Multiple ways to reach us including email, live chat, and phone support. We typically respond within 24 hours."
        keywords="contact Nova AI, customer support contact, sales inquiry, help desk contact, Nova AI support"
        ogType="website"
        structuredData={combinedSchema}
      />
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NovaLogo size="sm" showText={false} />

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection("contact-methods")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact Methods
            </button>
            <button
              onClick={() => scrollToSection("contact-form")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Send Message
            </button>
            <button
              onClick={() => scrollToSection("resources")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Resources
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </button>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 space-y-4">
            <button
              onClick={() => scrollToSection("contact-methods")}
              className="block w-full text-left py-2 text-sm"
            >
              Contact Methods
            </button>
            <button
              onClick={() => scrollToSection("contact-form")}
              className="block w-full text-left py-2 text-sm"
            >
              Send Message
            </button>
            <button
              onClick={() => scrollToSection("resources")}
              className="block w-full text-left py-2 text-sm"
            >
              Resources
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="block w-full text-left py-2 text-sm"
            >
              FAQ
            </button>
            <button
              onClick={() => setLocation("/")}
              className="block w-full text-left py-2 text-sm"
            >
              Home
            </button>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container max-w-7xl mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6">
                <MessageSquare className="w-3 h-3 mr-1" />
                We're Here to Help
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                Get in{" "}
                <span className="text-primary">Touch with Us</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Have questions about Nova AI? Our team is ready to help you
                get the most out of our platform. Reach out through any of our
                contact channels.
              </p>
            </div>
          </div>
        </section>

        <section
          id="contact-methods"
          className="py-20 bg-muted/30"
        >
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                Contact Methods
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Multiple ways to reach us
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose the contact method that works best for you
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send us an email and we'll respond within 24 hours
                  </p>
                  <a
                    href="mailto:support@supportboard.com"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    support@supportboard.com
                  </a>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chat with our team in real-time for instant help
                  </p>
                  <Button size="sm" variant="outline" className="gap-2 w-full">
                    Start Chat
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Phone Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Call us during business hours for immediate assistance
                  </p>
                  <a
                    href="tel:+18005551234"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    +1 (800) 555-1234
                  </a>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Sales Inquiries</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Interested in enterprise plans? Reach out to our sales team
                  </p>
                  <a
                    href="mailto:sales@supportboard.com"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    sales@supportboard.com
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="contact-form" className="py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                Send us a Message
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                We'd love to hear from you
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Fill out the form below and we'll get back to you as soon as
                possible
              </p>
            </div>

            <Card>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        disabled={contactMutation.isPending}
                        className={
                          formErrors.name
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }
                      />
                      {formErrors.name && (
                        <p className="text-sm text-destructive">
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        disabled={contactMutation.isPending}
                        className={
                          formErrors.email
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }
                      />
                      {formErrors.email && (
                        <p className="text-sm text-destructive">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input
                      id="company"
                      placeholder="Your company name"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      disabled={contactMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subject: value })
                      }
                      disabled={contactMutation.isPending}
                    >
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="sales">Sales Question</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.subject && (
                      <p className="text-sm text-destructive">
                        {formErrors.subject}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help..."
                      rows={6}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      disabled={contactMutation.isPending}
                      className={
                        formErrors.message
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    {formErrors.message && (
                      <p className="text-sm text-destructive">
                        {formErrors.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2"
                    disabled={contactMutation.isPending}
                  >
                    {contactMutation.isPending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        Send Message
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="locations" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <MapPin className="w-3 h-3 mr-1" />
                Office Locations
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Where we're located
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find us in one of our offices around the world
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Headquarters</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    San Francisco, CA
                  </p>
                  <p className="text-sm text-muted-foreground">
                    123 Market Street, Suite 500<br />
                    San Francisco, CA 94105, USA
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Europe Office</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    London, UK
                  </p>
                  <p className="text-sm text-muted-foreground">
                    10 Downing Street<br />
                    London, SW1A 2AA, UK
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Asia Pacific</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Singapore
                  </p>
                  <p className="text-sm text-muted-foreground">
                    1 Raffles Place<br />
                    Singapore 048616
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="resources" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                Resources
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Helpful resources
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers and learn more about Nova AI
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-3">Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comprehensive guides and API documentation to help you get started
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 p-0 h-auto text-primary hover:text-primary hover:bg-transparent"
                  >
                    Read Docs
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-3">Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse our knowledge base to find answers to common questions
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 p-0 h-auto text-primary hover:text-primary hover:bg-transparent"
                  >
                    Browse KB
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-3">Status Page</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check the current status of Nova AI and our services
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 p-0 h-auto text-primary hover:text-primary hover:bg-transparent"
                  >
                    Check Status
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about Nova AI
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <Accordion type="single" collapsible>
                  <AccordionItem value="question1">
                    <AccordionTrigger>
                      How do I get started with Nova AI?
                    </AccordionTrigger>
                    <AccordionContent>
                      Getting started is easy! Simply sign up for a free trial,
                      create your workspace, import your knowledge base, and
                      deploy the chat widget to your website. Our
                      onboarding guides will walk you through each step.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="question2">
                    <AccordionTrigger>
                      What is the cost of Nova AI?
                    </AccordionTrigger>
                    <AccordionContent>
                      We offer flexible pricing plans starting at $29/month
                      for startups, with Professional and Enterprise plans
                      available. All plans include a 14-day free trial with
                      no credit card required.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="question3">
                    <AccordionTrigger>
                      Can I integrate Nova AI with my existing tools?
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes! Nova AI integrates with popular tools like
                      Slack, Salesforce, Zendesk, and more. Check our
                      integrations page for the full list of available
                      integrations and custom API options.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="question4">
                    <AccordionTrigger>
                      Is my customer data secure?
                    </AccordionTrigger>
                    <AccordionContent>
                      Absolutely. Nova AI is GDPR compliant with
                      end-to-end encryption, comprehensive audit logs, and
                      enterprise-grade security. Your customer data is always
                      protected and never shared with third parties.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="question5">
                    <AccordionTrigger>
                      Do you offer white-label solutions?
                    </AccordionTrigger>
                    <AccordionContent>
                      Yes! Our Professional and Enterprise plans include
                      custom branding options. For full white-label solutions,
                      contact our sales team at sales@supportboard.com.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="question6">
                    <AccordionTrigger>
                      What kind of support do you provide?
                    </AccordionTrigger>
                    <AccordionContent>
                      We offer email support for all plans, live chat for
                      Professional and Enterprise customers, and priority
                      support with dedicated account managers for Enterprise
                      plans. Check our documentation and knowledge base for
                      self-service resources.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30 py-12">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="mb-4">
                <NovaLogo size="sm" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered customer support platform helping businesses deliver
                exceptional customer experiences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    GDPR
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              2024 Nova AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
