import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { NovaLogo } from "@/components/NovaLogo";
import {
  ArrowRight,
  Menu,
  X,
  Check,
  Lock,
  Mail,
  Zap,
  Users,
  BarChart3,
  Shield,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface PricingTier {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: {
    name: string;
    included: boolean;
  }[];
  highlighted?: boolean;
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 279,
    description: "Perfect for small teams getting started",
    features: [
      { name: "Up to 2 AI agents", included: true },
      { name: "1,000 conversations/month", included: true },
      { name: "Basic AI responses", included: true },
      { name: "Email support", included: true },
      { name: "Knowledge base (100 articles)", included: true },
      { name: "Basic analytics", included: true },
      { name: "Up to 3 team members", included: true },
      { name: "Standard integrations", included: true },
      { name: "Priority support", included: false },
      { name: "Advanced analytics", included: false },
      { name: "Custom integrations", included: false },
      { name: "Dedicated account manager", included: false },
      { name: "SLA guarantees", included: false },
      { name: "White-label solution", included: false },
      { name: "On-premise deployment", included: false },
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    annualPrice: 951,
    description: "For growing teams with advanced needs",
    features: [
      { name: "Up to 10 AI agents", included: true },
      { name: "10,000 conversations/month", included: true },
      { name: "Advanced AI with training", included: true },
      { name: "Priority support", included: true },
      { name: "Unlimited knowledge base", included: true },
      { name: "Full analytics suite", included: true },
      { name: "Up to 10 team members", included: true },
      { name: "Advanced integrations", included: true },
      { name: "Email support", included: true },
      { name: "Custom branding", included: true },
      { name: "API access", included: true },
      { name: "Dedicated account manager", included: false },
      { name: "SLA guarantees", included: false },
      { name: "White-label solution", included: false },
      { name: "On-premise deployment", included: false },
    ],
    highlighted: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For large organizations with custom requirements",
    features: [
      { name: "Unlimited AI agents", included: true },
      { name: "Unlimited conversations", included: true },
      { name: "Custom AI training", included: true },
      { name: "24/7 priority support", included: true },
      { name: "Unlimited knowledge base", included: true },
      { name: "Advanced analytics & reporting", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Custom integrations", included: true },
      { name: "Advanced security (SSO, SAML)", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "SLA guarantees", included: true },
      { name: "White-label solution", included: true },
      { name: "On-premise deployment", included: true },
      { name: "Custom feature development", included: true },
      { name: "Advanced compliance features", included: true },
    ],
    cta: "Contact Sales",
  },
];

const FAQS = [
  {
    question: "Can I change my plan later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
  },
  {
    question: "What's included in the free trial?",
    answer: "Your 14-day free trial includes full access to all features of the plan you choose. No credit card required.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! When you choose annual billing, you get a 20% discount on your monthly plan price. That's 2.4 months free!",
  },
  {
    question: "Can I scale beyond the Enterprise plan?",
    answer: "Absolutely. Our Enterprise plan is customizable. Contact our sales team to discuss your specific needs.",
  },
  {
    question: "What happens after my free trial ends?",
    answer: "Your trial will need to be converted to a paid plan to continue using Nova AI. We'll send you reminders before your trial ends.",
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee if you're not satisfied with Nova AI. No questions asked.",
  },
];

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [orgSignupOpen, setOrgSignupOpen] = useState(false);

  useEffect(() => {
    document.title = "Pricing - Nova AI | AI-Powered Customer Support";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Simple, transparent pricing for AI-powered customer support. Choose the perfect plan for your team. 14-day free trial included."
      );
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="cursor-pointer" onClick={() => setLocation("/")}>
            <NovaLogo size="sm" showText={false} />
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setLocation("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </button>
            <button onClick={() => scrollToSection("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Plans
            </button>
            <button onClick={() => scrollToSection("comparison")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Compare
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => scrollToSection("pricing")}>
              Get Started
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
            <button onClick={() => { setLocation("/"); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-sm">
              Home
            </button>
            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-sm">
              Plans
            </button>
            <button onClick={() => scrollToSection("comparison")} className="block w-full text-left py-2 text-sm">
              Compare
            </button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left py-2 text-sm">
              FAQ
            </button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setLocation("/"); setMobileMenuOpen(false); }}>
                Sign In
              </Button>
              <Button size="sm" className="flex-1" onClick={() => scrollToSection("pricing")}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container max-w-7xl mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6">
                <Zap className="w-3 h-3 mr-1" />
                Transparent Pricing
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                Simple, Transparent{" "}
                <span className="text-primary">Pricing</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Choose the plan that fits your team. All plans include a 14-day free trial with full access to all features.
              </p>
              <div className="flex items-center justify-center gap-4 mb-12">
                <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    isAnnual ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-background transition-transform ${
                      isAnnual ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                  Annual
                </span>
                {isAnnual && (
                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Save 20%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {PRICING_TIERS.map((tier) => (
                <PricingCard
                  key={tier.name}
                  tier={tier}
                  isAnnual={isAnnual}
                  onGetStarted={() => setOrgSignupOpen(true)}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="comparison" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Feature Comparison</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Compare all features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See what's included in each plan and choose the best fit for your needs.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-semibold w-48">Feature</th>
                    {PRICING_TIERS.map((tier) => (
                      <th key={tier.name} className="text-center py-4 px-4 font-semibold min-w-40">
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRICING_TIERS[0].features.map((feature, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 font-medium text-foreground">
                        {feature.name}
                      </td>
                      {PRICING_TIERS.map((tier) => {
                        const tierFeature = tier.features[idx];
                        return (
                          <td key={tier.name} className="text-center py-4 px-4">
                            {tierFeature.included ? (
                              <Check className="w-5 h-5 text-primary mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Contact our support team.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, idx) => (
                <Card key={idx} className="cursor-pointer hover-elevate transition-all">
                  <CardContent
                    className="p-6"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-lg">{faq.question}</h3>
                      <div className={`text-primary transition-transform duration-200 flex-shrink-0 ${
                        expandedFaq === idx ? "rotate-180" : ""
                      }`}>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                    {expandedFaq === idx && (
                      <p className="text-muted-foreground mt-4">{faq.answer}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
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
                    Ready to get started?
                  </h2>
                  <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                    Join thousands of businesses using Nova AI to deliver exceptional customer experiences. Start your free trial today with no credit card required.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Dialog open={orgSignupOpen} onOpenChange={setOrgSignupOpen}>
                      <DialogTrigger asChild>
                        <Button size="lg" variant="secondary" className="gap-2">
                          Start Free Trial
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <div className="text-center py-8">
                          <h3 className="text-xl font-semibold mb-2">Start Your Free Trial</h3>
                          <p className="text-muted-foreground mb-6">14-day free trial with full access to all features</p>
                          <Button className="w-full" size="lg">Get Started</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    >
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
              <div className="mb-4 cursor-pointer" onClick={() => setLocation("/")}>
                <NovaLogo size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered customer support platform helping businesses deliver exceptional customer experiences.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GDPR</a></li>
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
    </div>
  );
}

function PricingCard({
  tier,
  isAnnual,
  onGetStarted,
}: {
  tier: PricingTier;
  isAnnual: boolean;
  onGetStarted: () => void;
}) {
  const displayPrice = isAnnual ? tier.annualPrice : tier.monthlyPrice;
  const monthlyEquivalent = isAnnual ? (tier.annualPrice / 12).toFixed(0) : null;

  return (
    <Card
      className={`h-full relative transition-all duration-300 ${
        tier.highlighted ? "border-primary shadow-lg md:scale-105" : ""
      }`}
    >
      {tier.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <div className="mt-4">
          {tier.monthlyPrice === 0 ? (
            <span className="text-4xl font-bold">Custom</span>
          ) : (
            <>
              <span className="text-4xl font-bold">${displayPrice}</span>
              {isAnnual && monthlyEquivalent && (
                <span className="text-sm text-muted-foreground ml-1">
                  (${monthlyEquivalent}/mo)
                </span>
              )}
              {!isAnnual && (
                <span className="text-muted-foreground">/month</span>
              )}
            </>
          )}
        </div>
        <CardDescription className="mt-2">{tier.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          className="w-full mb-6"
          variant={tier.highlighted ? "default" : "outline"}
          onClick={onGetStarted}
        >
          {tier.cta}
        </Button>
        <ul className="space-y-3">
          {tier.features.slice(0, 8).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
