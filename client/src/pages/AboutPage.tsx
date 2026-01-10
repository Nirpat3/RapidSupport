import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { NovaLogo } from "@/components/NovaLogo";
import { 
  Heart,
  Lightbulb,
  Lock,
  Eye,
  Users,
  Award,
  TrendingUp,
  Zap,
  Mail,
  Phone,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Globe,
  Briefcase,
  Code,
  Shield,
  MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
}

interface Value {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export default function AboutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "About Nova AI - AI-Powered Customer Support Platform";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Learn about Nova AI, our mission to revolutionize customer support with AI, and meet our team of experienced professionals committed to helping businesses deliver exceptional customer experiences.'
      );
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const teamMembers: TeamMember[] = [
    {
      id: "1",
      name: "Alexandra Chen",
      role: "Chief Executive Officer",
      bio: "Former VP of Customer Experience at TechCorp. 15+ years in customer support technology.",
      initials: "AC"
    },
    {
      id: "2",
      name: "Marcus Williams",
      role: "Chief Technology Officer",
      bio: "AI and machine learning expert. Previously led engineering at AI innovations startup.",
      initials: "MW"
    },
    {
      id: "3",
      name: "Sarah Ahmed",
      role: "Head of Product",
      bio: "Product strategist with passion for customer-centric design. Built 3 successful SaaS products.",
      initials: "SA"
    },
    {
      id: "4",
      name: "James Rodriguez",
      role: "Head of Operations",
      bio: "Operations leader with 10+ years scaling high-growth startups and SaaS companies.",
      initials: "JR"
    }
  ];

  const values: Value[] = [
    {
      id: "1",
      title: "Customer First",
      description: "Every decision we make is guided by a deep commitment to our customers' success. Their challenges are our inspiration, and their growth is our mission.",
      icon: <Heart className="w-6 h-6" />
    },
    {
      id: "2",
      title: "Innovation",
      description: "We push the boundaries of what's possible in customer support technology. Continuous improvement and cutting-edge AI drive everything we do.",
      icon: <Lightbulb className="w-6 h-6" />
    },
    {
      id: "3",
      title: "Security & Privacy",
      description: "We treat your data with the utmost respect and maintain the highest standards of security. Trust is the foundation of our relationship.",
      icon: <Lock className="w-6 h-6" />
    },
    {
      id: "4",
      title: "Transparency",
      description: "Clear communication, honest conversations, and openness about our roadmap. We believe in building trust through transparency.",
      icon: <Eye className="w-6 h-6" />
    }
  ];

  const stats: Stat[] = [
    {
      label: "Customers Served",
      value: "500+",
      icon: <Users className="w-8 h-8" />
    },
    {
      label: "Messages Processed Daily",
      value: "2.5M+",
      icon: <MessageSquare className="w-8 h-8" />
    },
    {
      label: "Platform Uptime",
      value: "99.99%",
      icon: <TrendingUp className="w-8 h-8" />
    },
    {
      label: "Average Response Time",
      value: "<2 sec",
      icon: <Zap className="w-8 h-8" />
    }
  ];

  const integrations = [
    { name: "Slack", icon: "#" },
    { name: "Microsoft Teams", icon: "#" },
    { name: "Zendesk", icon: "#" },
    { name: "Salesforce", icon: "#" },
    { name: "HubSpot", icon: "#" },
    { name: "Intercom", icon: "#" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NovaLogo size="sm" showText={false} />
          
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('mission')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Our Mission
            </button>
            <button onClick={() => scrollToSection('story')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Our Story
            </button>
            <button onClick={() => scrollToSection('values')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Values
            </button>
            <button onClick={() => scrollToSection('team')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Team
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              Back to Home
            </Button>
            <Button size="sm" onClick={() => scrollToSection('contact')}>
              Contact Us
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
            <button onClick={() => scrollToSection('mission')} className="block w-full text-left py-2 text-sm">
              Our Mission
            </button>
            <button onClick={() => scrollToSection('story')} className="block w-full text-left py-2 text-sm">
              Our Story
            </button>
            <button onClick={() => scrollToSection('values')} className="block w-full text-left py-2 text-sm">
              Values
            </button>
            <button onClick={() => scrollToSection('team')} className="block w-full text-left py-2 text-sm">
              Team
            </button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setLocation("/")}>
                Home
              </Button>
              <Button size="sm" className="flex-1" onClick={() => scrollToSection('contact')}>
                Contact
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
                <Award className="w-3 h-3 mr-1" />
                About Our Company
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                Transforming Customer Support with{" "}
                <span className="text-primary">AI & Empathy</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                We're on a mission to help businesses deliver exceptional customer experiences 
                by combining intelligent AI technology with genuine human care.
              </p>
            </div>
          </div>
        </section>

        <section id="mission" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">Our Mission</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Revolutionizing Customer Support
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Customer support is broken. Long wait times, repetitive questions, and frustrated customers are the norm. We're here to change that.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  Nova AI combines powerful AI technology with genuine customer empathy to create support experiences that delight customers and empower teams.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">Reduce Response Times</p>
                      <p className="text-sm text-muted-foreground">Instant AI responses for common questions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">Increase Satisfaction</p>
                      <p className="text-sm text-muted-foreground">Consistent, helpful support 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold">Empower Your Team</p>
                      <p className="text-sm text-muted-foreground">Focus on complex, high-value interactions</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8 md:p-12">
                <div className="aspect-square flex items-center justify-center">
                  <div className="text-center">
                    <Lightbulb className="w-20 h-20 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Smarter support through intelligent technology
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="story" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Our Story</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It All Began
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From frustration to innovation, our journey started with a simple observation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  2021
                </div>
                <Card className="pt-8">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">The Problem</h3>
                    <p className="text-muted-foreground text-sm">
                      Our founder experienced firsthand the frustration of poor customer support, dealing with long wait times and unhelpful responses. She knew there had to be a better way.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  2022
                </div>
                <Card className="pt-8">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">Building the Vision</h3>
                    <p className="text-muted-foreground text-sm">
                      We assembled a team of AI experts, customer experience specialists, and engineers to build a platform that would transform how businesses support their customers.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  2024
                </div>
                <Card className="pt-8">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">Making an Impact</h3>
                    <p className="text-muted-foreground text-sm">
                      Today, Nova AI serves hundreds of companies, helping them provide exceptional customer support while reducing costs and improving satisfaction.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="values" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Our Values</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Guiding Principles
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core values shape every decision we make and every product we build.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {values.map(value => (
                <Card key={value.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                        {value.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                        <p className="text-muted-foreground text-sm">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="stats" className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Impact</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                By the Numbers
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The real impact of Nova AI across our customer base.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, idx) => (
                <Card key={idx}>
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                      {stat.icon}
                    </div>
                    <p className="text-3xl font-bold mb-2">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Leadership</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Meet Our Team
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Experienced leaders passionate about revolutionizing customer support.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map(member => (
                <Card key={member.id}>
                  <CardContent className="p-6 text-center">
                    <Avatar className="w-16 h-16 mx-auto mb-4">
                      <AvatarFallback className="bg-primary text-white text-lg font-semibold">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                    <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Integrations</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built to Work Together
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Nova AI seamlessly integrates with your favorite tools and platforms.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {integrations.map(integration => (
                <Card key={integration.name}>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">{integration.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-20 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4">
            <Card className="bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-12 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80" />
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Get in Touch
                  </h2>
                  <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                    Have questions about Nova AI? Want to learn more about our vision? We'd love to hear from you.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" className="gap-2">
                      <Mail className="w-4 h-4" />
                      Email Us
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                      <Phone className="w-4 h-4" />
                      Call Us
                    </Button>
                  </div>
                  <p className="text-primary-foreground/70 text-sm mt-8">
                    support@supportboard.com • +1 (555) 123-4567
                  </p>
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
              <div className="mb-4">
                <NovaLogo size="sm" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Transforming customer support with AI-powered technology and human empathy.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
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
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
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
