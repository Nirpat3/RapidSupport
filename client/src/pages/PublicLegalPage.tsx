import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Shield, Cookie, Globe, Building2 } from "lucide-react";
import { useState } from "react";
import { NovaLogo } from "@/components/NovaLogo";

const REGIONS = [
  { code: "us", name: "United States", flag: "US" },
  { code: "eu", name: "European Union (GDPR)", flag: "EU" },
  { code: "uk", name: "United Kingdom", flag: "UK" },
  { code: "ca", name: "Canada", flag: "CA" },
  { code: "au", name: "Australia", flag: "AU" },
  { code: "br", name: "Brazil (LGPD)", flag: "BR" },
  { code: "jp", name: "Japan", flag: "JP" },
  { code: "kr", name: "South Korea", flag: "KR" },
  { code: "sg", name: "Singapore", flag: "SG" },
];

const POLICY_TYPES = {
  "privacy-policy": {
    title: "Privacy Policy",
    icon: Shield,
    description: "How we collect, use, and protect your personal information"
  },
  "terms-of-service": {
    title: "Terms of Service",
    icon: FileText,
    description: "The terms and conditions for using our services"
  },
  "cookie-policy": {
    title: "Cookie Policy",
    icon: Cookie,
    description: "How we use cookies and similar technologies"
  }
};

export default function PublicLegalPage() {
  const { type } = useParams<{ type: string }>();
  const [selectedRegion, setSelectedRegion] = useState("us");
  
  const policyType = type as keyof typeof POLICY_TYPES;
  const policyInfo = POLICY_TYPES[policyType] || POLICY_TYPES["privacy-policy"];
  const PolicyIcon = policyInfo.icon;

  const { data: policy, isLoading } = useQuery<{ content?: string }>({
    queryKey: ['/api/public/legal', type, selectedRegion],
    enabled: !!type
  });

  const selectedRegionInfo = REGIONS.find(r => r.code === selectedRegion);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <NovaLogo size="sm" />
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.code} value={region.code}>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium">{region.flag}</span>
                      {region.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <PolicyIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{policyInfo.title}</CardTitle>
                <p className="text-muted-foreground">{policyInfo.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Globe className="w-3 h-3" />
                {selectedRegionInfo?.name || "United States"}
              </Badge>
              <Badge variant="secondary">
                Last updated: {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            ) : policy?.content ? (
              <div dangerouslySetInnerHTML={{ __html: policy.content }} />
            ) : (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                  <p className="text-muted-foreground">
                    Welcome to Nova AI. This {policyInfo.title.toLowerCase()} explains how we handle your information 
                    when you use our customer support platform. We are committed to protecting your privacy and 
                    ensuring transparency in all our practices.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                  <p className="text-muted-foreground mb-2">We may collect the following types of information:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Contact information (name, email address, phone number)</li>
                    <li>Account credentials and profile information</li>
                    <li>Communication history and support interactions</li>
                    <li>Usage data and analytics</li>
                    <li>Device and browser information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-2">We use collected information to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Provide and improve our customer support services</li>
                    <li>Respond to your inquiries and support requests</li>
                    <li>Personalize your experience on our platform</li>
                    <li>Send important service updates and notifications</li>
                    <li>Analyze usage patterns to enhance our platform</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
                  <p className="text-muted-foreground">
                    We implement industry-standard security measures to protect your personal information, 
                    including encryption, secure servers, and regular security audits. Access to personal 
                    data is restricted to authorized personnel only.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
                  <p className="text-muted-foreground mb-2">
                    Depending on your location, you may have the following rights regarding your personal data:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Right to access your personal information</li>
                    <li>Right to correct inaccurate data</li>
                    <li>Right to delete your data (right to be forgotten)</li>
                    <li>Right to data portability</li>
                    <li>Right to opt-out of marketing communications</li>
                  </ul>
                </section>

                {selectedRegion === "eu" && (
                  <section className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      GDPR Compliance
                    </h2>
                    <p className="text-muted-foreground">
                      For users in the European Union, we comply with the General Data Protection Regulation (GDPR). 
                      This includes providing you with enhanced data protection rights, obtaining explicit consent 
                      for data processing, and ensuring lawful basis for all data processing activities.
                    </p>
                  </section>
                )}

                <section>
                  <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
                  <p className="text-muted-foreground">
                    If you have questions about this {policyInfo.title.toLowerCase()} or our data practices, 
                    please contact us at <a href="mailto:privacy@nova-ai.com" className="text-primary hover:underline">privacy@nova-ai.com</a> or 
                    visit our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.
                  </p>
                </section>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-4">
          <Link href="/legal/privacy-policy">
            <Button variant={policyType === "privacy-policy" ? "default" : "outline"} size="sm">
              Privacy Policy
            </Button>
          </Link>
          <Link href="/legal/terms-of-service">
            <Button variant={policyType === "terms-of-service" ? "default" : "outline"} size="sm">
              Terms of Service
            </Button>
          </Link>
          <Link href="/legal/cookie-policy">
            <Button variant={policyType === "cookie-policy" ? "default" : "outline"} size="sm">
              Cookie Policy
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="container max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>2024 Nova AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
