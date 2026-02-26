import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { data: status, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/auth/2fa/status"],
  });

  const setupMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/2fa/setup", "POST"),
    onSuccess: (data: any) => {
      setSetupData(data);
      setVerifyCode("");
    },
    onError: () => {
      toast({ title: "Setup failed", description: "Could not start 2FA setup.", variant: "destructive" });
    },
  });

  const enableMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("/api/auth/2fa/enable", "POST", {
        secret: setupData!.secret,
        code,
        backupCodes: setupData!.backupCodes,
      }),
    onSuccess: () => {
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now active." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      setSetupData(null);
      setVerifyCode("");
      setShowBackupCodes(true);
    },
    onError: (error: any) => {
      toast({ title: "Verification failed", description: error?.message || "Invalid code.", variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (password: string) =>
      apiRequest("/api/auth/2fa/disable", "POST", { password }),
    onSuccess: () => {
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been turned off." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      setShowDisableDialog(false);
      setDisablePassword("");
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Incorrect password.", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-96 animate-pulse" />
      </div>
    );
  }

  const isEnabled = status?.enabled ?? false;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage two-factor authentication and account security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an authenticator app.
              </CardDescription>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"} className={isEnabled ? "bg-emerald-500 text-white" : ""}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnabled && !setupData && (
            <>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You'll be prompted for a 6-digit code from your authenticator app when signing in.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setShowDisableDialog(true)}
                  className="text-destructive border-destructive/50"
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </>
          )}

          {!isEnabled && !setupData && (
            <>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is currently disabled. Enable it to secure your account with an authenticator app (Google Authenticator, Authy, etc.).
              </p>
              <Button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
                data-testid="button-setup-2fa"
              >
                <Shield className="mr-2 h-4 w-4" />
                {setupMutation.isPending ? "Setting up..." : "Set Up 2FA"}
              </Button>
            </>
          )}

          {setupData && (
            <div className="space-y-5">
              <div>
                <h3 className="font-medium mb-1">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Open your authenticator app and scan this QR code.
                </p>
                <div className="inline-block rounded-lg border p-3 bg-white">
                  <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-1">Manual Entry Key</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  If you can't scan the QR code, enter this key manually.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono tracking-widest">
                    {showSecret ? setupData.secret : "•".repeat(setupData.secret.length)}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(setupData.secret, "Secret key")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-1">Step 2: Save Backup Codes</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Store these backup codes securely. Each can be used once if you lose access to your authenticator.
                </p>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="px-2 py-1 bg-muted rounded text-sm font-mono text-center">
                      {code}
                    </code>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.backupCodes.join("\n"), "Backup codes")}
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copy All Codes
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-1">Step 3: Verify Setup</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the 6-digit code from your authenticator app to confirm setup.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="000000"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className="w-36 text-center font-mono text-lg tracking-widest"
                    data-testid="input-2fa-verify-code"
                  />
                  <Button
                    onClick={() => enableMutation.mutate(verifyCode)}
                    disabled={verifyCode.length !== 6 || enableMutation.isPending}
                    data-testid="button-confirm-2fa"
                  >
                    {enableMutation.isPending ? "Verifying..." : "Confirm & Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setSetupData(null); setVerifyCode(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Security</CardTitle>
          <CardDescription>Information about your current login session.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sessions are secured with HTTP-only cookies and expire automatically. Sign out from all devices is available via the logout button.
          </p>
        </CardContent>
      </Card>

      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              This will remove the extra security from your account. Enter your current password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="disable-password">Current Password</Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisableDialog(false); setDisablePassword(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate(disablePassword)}
              disabled={!disablePassword || disableMutation.isPending}
            >
              {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
