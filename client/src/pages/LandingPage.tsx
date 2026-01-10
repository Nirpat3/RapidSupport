import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  MessageSquare, 
  Search,
  ArrowRight,
  Sparkles,
  Shield,
  Clock
} from "lucide-react";
import { useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: organizations = [], isLoading } = useQuery<PublicOrganization[]>({
    queryKey: ['/api/public/organizations'],
  });

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Support Board</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with organizations for instant customer support. Choose an organization below to start chatting.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center p-6">
            <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mx-auto mb-3">
              <Clock className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-semibold mb-2">Instant Support</h3>
            <p className="text-sm text-muted-foreground">Get help immediately with AI-powered responses</p>
          </Card>
          <Card className="text-center p-6">
            <div className="p-3 rounded-xl bg-blue-500/10 w-fit mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold mb-2">Smart Assistance</h3>
            <p className="text-sm text-muted-foreground">AI agents trained on organization knowledge bases</p>
          </Card>
          <Card className="text-center p-6">
            <div className="p-3 rounded-xl bg-purple-500/10 w-fit mx-auto mb-3">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold mb-2">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">Your conversations are protected and confidential</p>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Organizations
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          ) : filteredOrgs.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "No organizations found" : "No organizations available"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try a different search term" 
                  : "Organizations will appear here once registered"}
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.map(org => (
                <Link key={org.id} href={`/chat/${org.slug}`}>
                  <Card className="hover-elevate cursor-pointer transition-all duration-200 h-full">
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
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <Badge variant="secondary" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Chat Available
                        </Badge>
                        <Button size="sm" variant="ghost" className="gap-1">
                          Start Chat
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Powered by Support Board - Multi-tenant Customer Support Platform</p>
        </div>
      </div>
    </div>
  );
}
