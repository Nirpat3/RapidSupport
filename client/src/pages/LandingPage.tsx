import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  MessageSquare, 
  Search,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Users,
  Briefcase,
  CheckCircle2,
  Zap,
  Globe,
  BookOpen,
  BarChart3,
  Palette,
  Lock,
  Mail,
  Phone,
  Play,
  Star,
  Check,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NovaLogo, NovaTagline } from "@/components/NovaLogo";
import { SEO, generateOrganizationSchema, generateWebsiteSchema, generateSoftwareApplicationSchema } from "@/components/SEO";

interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  welcomeMessage: string | null;
  website: string | null;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [customerSignupOpen, setCustomerSignupOpen] = useState(false);
  const [orgSignupOpen, setOrgSignupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: organizations = [], isLoading } = useQuery<PublicOrganization[]>({
    queryKey: ['/api/public/organizations'],
  });

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [
      generateOrganizationSchema(),
      generateWebsiteSchema(),
      generateSoftwareApplicationSchema()
    ]
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Nova AI - Your Intelligent Support Companion"
        description="Transform customer support with AI-powered assistance, smart routing, and personalized experiences. Trusted by businesses worldwide for exceptional customer service."
        keywords="AI customer support, chatbot, help desk, customer service automation, live chat, knowledge base, AI assistant"
        ogType="website"
        structuredData={combinedSchema}
      />
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NovaLogo size="sm" />
          
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollToSection('organizations')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Marketplace
            </button>
            <button onClick={() => setLocation('/about')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </button>
            <button onClick={() => setLocation('/contact')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Dialog open={staffLoginOpen} onOpenChange={setStaffLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <StaffLoginForm 
                  onSuccess={() => {
                    setStaffLoginOpen(false);
                    setLocation("/dashboard");
                  }} 
                />
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => scrollToSection('pricing')}>
              Start Free Trial
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 space-y-4">
            <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-sm">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left py-2 text-sm">
              How It Works
            </button>
            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-sm">
              Pricing
            </button>
            <button onClick={() => scrollToSection('organizations')} className="block w-full text-left py-2 text-sm">
              Marketplace
            </button>
            <button onClick={() => setLocation('/about')} className="block w-full text-left py-2 text-sm">
              About
            </button>
            <button onClick={() => setLocation('/contact')} className="block w-full text-left py-2 text-sm">
              Contact
            </button>
            <div className="flex gap-2 pt-2">
              <Dialog open={staffLoginOpen} onOpenChange={setStaffLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    Sign In
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <StaffLoginForm 
                    onSuccess={() => {
                      setStaffLoginOpen(false);
                      setLocation("/dashboard");
                    }} 
                  />
                </DialogContent>
              </Dialog>
              <Button size="sm" className="flex-1" onClick={() => scrollToSection('pricing')}>
                Start Free Trial
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container max-w-7xl mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered Customer Support Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                Transform Customer Support with{" "}
                <span className="text-primary">Intelligent AI</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Deliver exceptional customer experiences with AI-powered chat, smart routing, 
                and seamless multi-channel support. Reduce response times by 80% while increasing customer satisfaction.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="gap-2" onClick={() => setOrgSignupOpen(true)}>
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <Play className="w-4 h-4" />
                  See Demo
                </Button>
              </div>
              <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  No credit card required
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need for exceptional support
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to help your team deliver outstanding customer experiences at scale.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Sparkles className="w-6 h-6" />}
                title="AI-Powered Chat Support"
                description="Smart routing and automated responses powered by advanced AI. Resolve common queries instantly while routing complex issues to the right agents."
                color="blue"
              />
              <FeatureCard
                icon={<Globe className="w-6 h-6" />}
                title="Multi-channel Integration"
                description="Seamlessly manage conversations across web, email, and mobile from a single unified inbox. Meet customers where they are."
                color="green"
              />
              <FeatureCard
                icon={<BookOpen className="w-6 h-6" />}
                title="Knowledge Base Management"
                description="Build a self-service portal with AI-powered search. Help customers find answers instantly and reduce support ticket volume."
                color="purple"
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Analytics & Insights"
                description="Track performance metrics, customer satisfaction, and team productivity with real-time dashboards and detailed reports."
                color="amber"
              />
              <FeatureCard
                icon={<Palette className="w-6 h-6" />}
                title="Multi-tenant Support"
                description="White-label solution with custom branding for each organization. Perfect for agencies and enterprise deployments."
                color="rose"
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Enterprise Security"
                description="GDPR compliant with end-to-end encryption, SSO support, and comprehensive audit logs. Your data is always protected."
                color="cyan"
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get started in minutes
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Setting up Nova AI is quick and easy. Start delivering better customer support today.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Your Workspace</h3>
                <p className="text-muted-foreground">
                  Sign up and customize your support portal with your branding, colors, and welcome messages.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Import Your Knowledge</h3>
                <p className="text-muted-foreground">
                  Upload documents, FAQs, and product information to train your AI assistant.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Go Live</h3>
                <p className="text-muted-foreground">
                  Embed the chat widget on your website and start providing instant AI-powered support.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Testimonials</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trusted by growing businesses
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about their experience with Nova AI.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                quote="Nova AI reduced our response time from hours to minutes. Our customers love the instant AI responses."
                author="Sarah Chen"
                role="Customer Success Manager"
                company="TechStart Inc."
              />
              <TestimonialCard
                quote="The multi-tenant feature is perfect for our agency. Each client gets their own branded portal."
                author="Michael Rodriguez"
                role="CEO"
                company="Digital Agency Co."
              />
              <TestimonialCard
                quote="We've seen a 60% reduction in support tickets since implementing the knowledge base."
                author="Emily Watson"
                role="Head of Support"
                company="SaaS Solutions"
              />
            </div>
          </div>
        </section>

        <section id="organizations" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Marketplace</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Organizations using Nova AI
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join these organizations providing exceptional customer support with our platform.
              </p>
            </div>
            
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <Card className="p-12 text-center max-w-md mx-auto">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Be the first!</h3>
                <p className="text-muted-foreground mb-4">Register your organization and start providing AI-powered support.</p>
                <Button onClick={() => setOrgSignupOpen(true)}>
                  Register Now
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="pricing" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your team. All plans include a 14-day free trial.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard
                name="Starter"
                price="$29"
                description="Perfect for small teams getting started"
                features={[
                  "Up to 3 team members",
                  "1,000 conversations/month",
                  "AI-powered responses",
                  "Basic analytics",
                  "Email support",
                  "Knowledge base (100 articles)"
                ]}
                onAction={() => setOrgSignupOpen(true)}
              />
              <PricingCard
                name="Professional"
                price="$99"
                description="For growing teams with advanced needs"
                features={[
                  "Up to 10 team members",
                  "10,000 conversations/month",
                  "Advanced AI with training",
                  "Full analytics suite",
                  "Priority support",
                  "Unlimited knowledge base",
                  "Custom branding",
                  "API access"
                ]}
                popular
                onAction={() => setOrgSignupOpen(true)}
              />
              <PricingCard
                name="Enterprise"
                price="Custom"
                description="For large organizations with custom requirements"
                features={[
                  "Unlimited team members",
                  "Unlimited conversations",
                  "Custom AI training",
                  "Advanced security (SSO, SAML)",
                  "Dedicated account manager",
                  "SLA guarantees",
                  "White-label solution",
                  "On-premise deployment option"
                ]}
                onAction={() => setOrgSignupOpen(true)}
              />
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <Card className="bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-12 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80" />
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Ready to transform your customer support?
                  </h2>
                  <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                    Join thousands of businesses using Nova AI to deliver exceptional customer experiences. Start your free trial today.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" className="gap-2" onClick={() => setOrgSignupOpen(true)}>
                      Get Started Free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                      <Mail className="w-4 h-4" />
                      Contact Sales
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30 py-12">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <span className="font-bold text-lg">Nova AI</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered customer support platform helping businesses deliver exceptional customer experiences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><a href="#features" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><Link href="/api-docs" className="hover:text-foreground transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/legal/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/legal/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/legal/privacy-policy" className="hover:text-foreground transition-colors">Security</Link></li>
                <li><Link href="/legal/privacy-policy?region=eu" className="hover:text-foreground transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              2024 Nova AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={customerSignupOpen} onOpenChange={setCustomerSignupOpen}>
        <DialogContent className="max-w-md">
          <CustomerSignupForm 
            organizations={organizations}
            onSuccess={() => {
              setCustomerSignupOpen(false);
              toast({
                title: "Account created",
                description: "You can now access the customer portal.",
              });
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={orgSignupOpen} onOpenChange={setOrgSignupOpen}>
        <DialogContent className="max-w-lg">
          <OrganizationSignupForm 
            onSuccess={() => {
              setOrgSignupOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/public/organizations'] });
              toast({
                title: "Organization registered",
                description: "Your organization is now set up. Check your email for login details.",
              });
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function TestimonialCard({ quote, author, role, company }: {
  quote: string;
  author: string;
  role: string;
  company: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-muted-foreground mb-6">"{quote}"</p>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{author}</p>
            <p className="text-xs text-muted-foreground">{role}, {company}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PricingCard({ name, price, description, features, popular = false, onAction }: {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  onAction?: () => void;
}) {
  return (
    <Card className={`h-full relative ${popular ? 'border-primary shadow-lg' : ''}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{name}</CardTitle>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
          {price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" variant={popular ? 'default' : 'outline'} onClick={onAction}>
          {price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrganizationCard({ org }: { org: PublicOrganization }) {
  return (
    <Card className="hover-elevate transition-all duration-200 h-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            {org.logo ? (
              <AvatarImage src={org.logo} alt={org.name} />
            ) : null}
            <AvatarFallback 
              className="text-lg font-semibold"
              style={{ 
                backgroundColor: org.primaryColor ? `${org.primaryColor}20` : undefined,
                color: org.primaryColor || undefined
              }}
            >
              {org.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{org.name}</h3>
            {org.welcomeMessage && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {org.welcomeMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Chat Available
          </Badge>
          <div className="flex gap-2">
            <Link href={`/org/${org.slug}/login`}>
              <Button size="sm" variant="ghost" className="gap-1">
                <LogIn className="w-3 h-3" />
                Login
              </Button>
            </Link>
            <a href={`/chat/${org.slug}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-1">
                Start Chat
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StaffLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await apiRequest('/api/auth/login', 'POST', credentials);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });
      
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter both email and password",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Staff Login
        </DialogTitle>
        <DialogDescription>
          Sign in to access the admin dashboard
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            placeholder="you@organization.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Password</Label>
          <div className="relative">
            <Input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </>
  );
}

function CustomerSignupForm({ organizations, onSuccess }: { organizations: PublicOrganization[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; company?: string; organizationId?: string }) => {
      return await apiRequest('/api/public/customers/signup', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "You can now log in to the customer portal.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "Could not create account",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields",
      });
      return;
    }
    signupMutation.mutate({ 
      name, 
      email, 
      password, 
      company: company || undefined,
      organizationId: selectedOrgId || undefined 
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Customer Sign Up
        </DialogTitle>
        <DialogDescription>
          Create an account to access customer portal features
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Full Name *</Label>
          <Input
            id="customer-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email *</Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-password">Password *</Label>
          <div className="relative">
            <Input
              id="customer-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={signupMutation.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-company">Company (optional)</Label>
          <Input
            id="customer-company"
            placeholder="Your company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={signupMutation.isPending}
          />
        </div>
        {organizations.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="customer-org">Associated Organization (optional)</Label>
            <select
              id="customer-org"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              disabled={signupMutation.isPending}
            >
              <option value="">Select an organization...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </>
  );
}

function OrganizationSignupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (data: { 
      organizationName: string; 
      slug: string; 
      adminName: string; 
      adminEmail: string; 
      adminPassword: string;
    }) => {
      return await apiRequest('/api/public/organizations/signup', 'POST', {
        organization: {
          name: data.organizationName,
          slug: data.slug,
        },
        admin: {
          name: data.adminName,
          email: data.adminEmail,
          password: data.adminPassword,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Organization registered",
        description: "Your organization is now set up. You can sign in with your admin credentials.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Could not register organization",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!orgName || !orgSlug) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please fill in organization name and URL",
        });
        return;
      }
      setStep(2);
    } else {
      if (!adminName || !adminEmail || !adminPassword) {
        toast({
          variant: "destructive",
          title: "Missing information",
          description: "Please fill in all admin details",
        });
        return;
      }
      signupMutation.mutate({
        organizationName: orgName,
        slug: orgSlug,
        adminName,
        adminEmail,
        adminPassword,
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Register Your Organization
        </DialogTitle>
        <DialogDescription>
          {step === 1 ? "Set up your organization details" : "Create your admin account"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                name="organizationName"
                data-testid="org-name-input"
                placeholder="Acme Corporation"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Organization URL *</Label>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-1">/chat/</span>
                <Input
                  id="org-slug"
                  name="organizationSlug"
                  data-testid="org-slug-input"
                  placeholder="acme-corp"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" data-testid="org-continue-btn">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Admin Name *</Label>
              <Input
                id="admin-name"
                name="adminName"
                data-testid="admin-name-input"
                placeholder="John Smith"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={signupMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email *</Label>
              <Input
                id="admin-email"
                name="adminEmail"
                data-testid="admin-email-input"
                type="email"
                placeholder="admin@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={signupMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password *</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="adminPassword"
                  data-testid="admin-password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={signupMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={signupMutation.isPending}>
                Back
              </Button>
              <Button type="submit" className="flex-1" data-testid="org-register-btn" disabled={signupMutation.isPending}>
                {signupMutation.isPending ? "Registering..." : "Register Organization"}
              </Button>
            </div>
          </>
        )}
      </form>
    </>
  );
}
