import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Building2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function CustomerPortalAcceptTransfer() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: transfer, isLoading, error } = useQuery<any>({
    queryKey: ['/api/business-transfer/token', token],
    queryFn: () => apiRequest('GET', `/api/business-transfer/token/${token}`).then(r => r.json()),
    enabled: !!token,
  });

  const acceptTransfer = useMutation({
    mutationFn: () => apiRequest('POST', `/api/business-transfer/accept/${token}`).then(r => r.json()),
    onSuccess: (data) => {
      setDone("accepted");
      toast({ title: "Transfer accepted!", description: "You are now the admin of this organization." });
      setTimeout(() => setLocation('/portal/org'), 2500);
    },
    onError: (err: any) => toast({ title: "Transfer failed", description: err.message, variant: "destructive" }),
  });

  const rejectTransfer = useMutation({
    mutationFn: () => apiRequest('POST', `/api/business-transfer/reject/${token}`, { reason: rejectionReason }),
    onSuccess: () => {
      setDone("rejected");
      toast({ title: "Transfer declined" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading transfer details...</div>
      </div>
    );
  }

  if (error || !transfer || (transfer as any).error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transfer Not Found</h2>
            <p className="text-muted-foreground">This transfer link is invalid or has expired. Transfer links are valid for 7 days.</p>
            <Button className="mt-6" onClick={() => setLocation('/portal/dashboard')}>Go to Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transfer Complete!</h2>
            <p className="text-muted-foreground">You are now the admin of <strong>{transfer.orgName}</strong>. Redirecting to your organization hub...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Transfer Declined</h2>
            <p className="text-muted-foreground">You have declined the transfer of <strong>{transfer.orgName}</strong>.</p>
            <Button className="mt-6" variant="outline" onClick={() => setLocation('/portal/dashboard')}>Go to Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ArrowRightLeft className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>Business Ownership Transfer</CardTitle>
          <CardDescription>You have been invited to take ownership of a business account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="bg-muted rounded-md p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-semibold">{transfer.orgName}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Transferred from</p>
                <p className="font-medium">{transfer.fromEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium">{format(new Date(transfer.expiresAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {transfer.includeConversations && <Badge variant="outline">Conversation history</Badge>}
              {transfer.includeTickets && <Badge variant="outline">Support tickets</Badge>}
              {transfer.includeMembers && <Badge variant="outline">Team members</Badge>}
            </div>
          </div>

          {transfer.transferNote && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Note from sender</p>
              <p className="text-sm">{transfer.transferNote}</p>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <p>Accepting this transfer will make you the admin of <strong>{transfer.orgName}</strong>. The current admin will become a regular member.</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => rejectTransfer.mutate()} disabled={rejectTransfer.isPending}>
              Decline
            </Button>
            <Button className="flex-1" onClick={() => acceptTransfer.mutate()} disabled={acceptTransfer.isPending}>
              {acceptTransfer.isPending ? "Processing..." : "Accept Transfer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
