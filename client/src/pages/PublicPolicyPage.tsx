import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DOMPurify from "isomorphic-dompurify";
import { 
  FileText, 
  Shield, 
  Cookie, 
  ArrowLeft, 
  Globe,
  Calendar,
  Building2
} from "lucide-react";
import { useState } from "react";

type PolicyType = 'terms' | 'privacy' | 'cookies';

interface LegalPolicy {
  id: string;
  organizationId: string | null;
  type: PolicyType;
  region: string;
  title: string;
  content: string;
  summary: string | null;
  version: string;
  effectiveDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

const POLICY_ICONS: Record<PolicyType, typeof FileText> = {
  terms: FileText,
  privacy: Shield,
  cookies: Cookie
};

const POLICY_TITLES: Record<PolicyType, string> = {
  terms: 'Terms and Conditions',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy'
};

const REGIONS = [
  { code: 'global', name: 'Global' },
  { code: 'us', name: 'United States' },
  { code: 'eu', name: 'European Union' },
  { code: 'uk', name: 'United Kingdom' },
  { code: 'caribbean', name: 'Caribbean' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'latam', name: 'Latin America' },
  { code: 'asia', name: 'Asia Pacific' }
];

export default function PublicPolicyPage() {
  const [, paramsWithSlug] = useRoute("/org/:slug/policies/:type");
  const [, paramsWithoutSlug] = useRoute("/policies/:type");
  
  const params = paramsWithSlug || paramsWithoutSlug;
  const slug = paramsWithSlug?.slug;
  const policyType = params?.type as PolicyType;
  
  const [selectedRegion, setSelectedRegion] = useState('global');

  const { data: organization } = useQuery<Organization>({
    queryKey: ['/api/public/organizations/slug', slug] as const,
    enabled: !!slug
  });

  const policyUrl = slug 
    ? `/api/public/org/${slug}/policies/${policyType}?region=${selectedRegion}`
    : `/api/public/policies/${policyType}?region=${selectedRegion}`;

  const { data: policy, isLoading, error } = useQuery<LegalPolicy>({
    queryKey: ['/api/public/policies', slug || 'platform', policyType, selectedRegion] as const,
    queryFn: async () => {
      const res = await fetch(policyUrl);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Policy not found' }));
        throw new Error(err.error || 'Policy not found');
      }
      return res.json();
    },
    enabled: !!policyType,
    staleTime: 5 * 60 * 1000
  });

  const Icon = POLICY_ICONS[policyType] || FileText;
  const title = POLICY_TITLES[policyType] || 'Legal Policy';

  if (!policyType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Policy Not Found</h2>
            <p className="text-muted-foreground mb-4">
              Please specify a valid policy type (terms, privacy, or cookies).
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              {organization ? (
                <div className="flex items-center gap-2">
                  {organization.logo ? (
                    <img src={organization.logo} alt={organization.name} className="w-8 h-8 rounded" />
                  ) : (
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="font-medium">{organization.name}</span>
                </div>
              ) : (
                <span className="font-medium">Support Board</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{title} Not Available</h2>
              <p className="text-muted-foreground mb-4">
                {(error as Error).message || `The ${title.toLowerCase()} for this region is not yet available.`}
              </p>
              <div className="flex justify-center gap-2">
                {selectedRegion !== 'global' && (
                  <Button variant="outline" onClick={() => setSelectedRegion('global')}>
                    View Global Version
                  </Button>
                )}
                <Link href="/">
                  <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : policy ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-6 h-6 text-primary" />
                    <CardTitle className="text-2xl">{policy.title}</CardTitle>
                  </div>
                  {policy.summary && (
                    <CardDescription className="text-base">
                      {policy.summary}
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end text-sm text-muted-foreground">
                  <Badge variant="outline">
                    Version {policy.version}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Effective: {new Date(policy.effectiveDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    <Globe className="w-3 h-3 mr-1" />
                    {REGIONS.find(r => r.code === policy.region)?.name || policy.region}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <PolicyContent content={policy.content} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Questions about this policy?{' '}
            <Link href={slug ? `/chat/${slug}` : '/support'}>
              <Button variant="link" className="p-0 h-auto">
                Contact Support
              </Button>
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function PolicyContent({ content }: { content: string }) {
  const html = markdownToHtml(content);
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown
    .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold mt-6 mb-2">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-10 mb-4">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');
  
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/gim, (match) => {
    if (match.includes('list-decimal')) {
      return `<ol class="my-4 space-y-1">${match}</ol>`;
    }
    return `<ul class="my-4 space-y-1 list-disc">${match}</ul>`;
  });
  
  html = html.replace(/\n\n/g, '</p><p class="my-4">');
  html = html.replace(/\n/g, '<br />');
  
  if (!html.startsWith('<')) {
    html = `<p class="my-4">${html}</p>`;
  }
  
  return html;
}
