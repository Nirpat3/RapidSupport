import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Smartphone, 
  Share, 
  Plus, 
  MoreVertical, 
  Download, 
  CheckCircle,
  Apple,
  Chrome,
  Globe,
  Zap,
  Bell,
  WifiOff,
  ArrowLeft
} from "lucide-react";
import { NovaLogo } from "@/components/NovaLogo";

export default function InstallAppPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" data-testid="install-app-page">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <NovaLogo size="sm" />
            </div>
          </Link>
          <Link href="/welcome">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="page-title">
            Install Nova AI App
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Add Nova AI to your home screen for quick access, just like a native app. 
            Works offline and provides a seamless mobile experience.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <h3 className="font-semibold mb-1">Fast Access</h3>
              <p className="text-sm text-muted-foreground">
                Launch directly from your home screen
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold mb-1">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Stay updated with push notifications
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <WifiOff className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold mb-1">Works Offline</h3>
              <p className="text-sm text-muted-foreground">
                Access cached content without internet
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ios" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3">
              <TabsTrigger value="ios" className="flex-1 sm:flex-none gap-2" data-testid="tab-ios">
                <Apple className="w-4 h-4" />
                iPhone / iPad
              </TabsTrigger>
              <TabsTrigger value="android" className="flex-1 sm:flex-none gap-2" data-testid="tab-android">
                <Chrome className="w-4 h-4" />
                Android
              </TabsTrigger>
              <TabsTrigger value="desktop" className="flex-1 sm:flex-none gap-2" data-testid="tab-desktop">
                <Globe className="w-4 h-4" />
                Desktop
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ios" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="w-5 h-5" />
                  Install on iPhone or iPad
                </CardTitle>
                <CardDescription>
                  Follow these steps using Safari browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Open in Safari</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Make sure you're using Safari browser, not Chrome or another browser. 
                        This feature only works in Safari on iOS.
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Safari is required
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Tap the Share Button</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Look for the share icon at the bottom of Safari (a square with an upward arrow).
                      </p>
                      <div className="inline-flex items-center gap-2 bg-muted p-2 rounded-md">
                        <Share className="w-5 h-5" />
                        <span className="text-sm">Share</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Select "Add to Home Screen"</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Scroll down in the share menu and tap "Add to Home Screen". 
                        You may need to scroll right to find this option.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-muted p-2 rounded-md">
                        <Plus className="w-5 h-5" />
                        <span className="text-sm">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Tap "Add"</h4>
                      <p className="text-sm text-muted-foreground">
                        Confirm by tapping "Add" in the top right corner. 
                        The app icon will now appear on your home screen!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="android" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="w-5 h-5" />
                  Install on Android
                </CardTitle>
                <CardDescription>
                  Follow these steps using Chrome browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Open in Chrome</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Make sure you're using Chrome browser for the best experience.
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Chrome recommended
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Tap the Menu (3 dots)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Look for the three vertical dots in the top right corner of Chrome.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-muted p-2 rounded-md">
                        <MoreVertical className="w-5 h-5" />
                        <span className="text-sm">Menu</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Select "Install App" or "Add to Home Screen"</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Look for "Install App" or "Add to Home Screen" in the menu. 
                        The exact wording may vary by device.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-muted p-2 rounded-md">
                        <Download className="w-5 h-5" />
                        <span className="text-sm">Install App</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Confirm Installation</h4>
                      <p className="text-sm text-muted-foreground">
                        Tap "Install" in the popup dialog. The app will be added to your home screen 
                        and app drawer automatically!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="desktop" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Install on Desktop
                </CardTitle>
                <CardDescription>
                  Install as a desktop app using Chrome or Edge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Open in Chrome or Edge</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        This feature works best in Chrome or Microsoft Edge browsers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Look for the Install Icon</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        In the address bar, you may see an install icon (a plus sign in a box) 
                        on the right side. Click it to install.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Alternative: Use the Menu</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Click the three dots menu in Chrome, then select "Install Nova AI..." 
                        or "Save and Share" and then "Install as app" in Edge.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Launch from Desktop</h4>
                      <p className="text-sm text-muted-foreground">
                        After installation, the app will open in its own window and you can find it 
                        in your Start menu (Windows) or Applications folder (Mac).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  If you're having trouble installing the app, try refreshing this page or 
                  using a different browser. The installation process may vary slightly depending 
                  on your device and browser version.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
