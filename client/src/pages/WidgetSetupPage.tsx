import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Code, 
  Copy, 
  CheckCircle, 
  Settings, 
  Palette, 
  Globe,
  MessageSquare,
  Sparkles,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function WidgetSetupPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<'script' | 'html' | 'react' | null>(null);
  
  // Widget configuration
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [primaryColor, setPrimaryColor] = useState('#0066FF');
  const [greeting, setGreeting] = useState('Hi! How can we help you today?');
  const [buttonText, setButtonText] = useState('Chat with us');
  const [enableAI, setEnableAI] = useState(true);
  const [customData, setCustomData] = useState('');
  const [jsonError, setJsonError] = useState<string>('');

  const baseUrl = window.location.origin;

  // Validate JSON custom data
  const validateCustomData = (data: string): { isValid: boolean; parsed?: any; error?: string } => {
    if (!data.trim()) {
      return { isValid: true, parsed: undefined };
    }
    
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { isValid: false, error: 'Custom data must be a JSON object (not an array or primitive)' };
      }
      return { isValid: true, parsed };
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON syntax. Please check your formatting.' };
    }
  };

  // Handle custom data changes with validation
  const handleCustomDataChange = (value: string) => {
    setCustomData(value);
    const validation = validateCustomData(value);
    setJsonError(validation.error || '');
  };

  // Generate embed code based on configuration
  const generateScriptTag = () => {
    const validation = validateCustomData(customData);
    
    const config = {
      position,
      primaryColor,
      greeting,
      buttonText,
      enableAI,
      ...(validation.isValid && validation.parsed && { customData: validation.parsed })
    };

    return `<!-- Support Board Chat Widget -->
<script>
  window.SupportBoardConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="${baseUrl}/widget.js" async></script>`;
  };

  const generateHTMLExample = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Website</title>
</head>
<body>
  <h1>Your Website Content</h1>
  
  <!-- Add Support Board Widget before closing body tag -->
  ${generateScriptTag()}
</body>
</html>`;
  };

  const generateReactExample = () => {
    const validation = validateCustomData(customData);
    const customDataString = validation.isValid && validation.parsed 
      ? `\n      customData: ${JSON.stringify(validation.parsed)},`
      : '';
      
    return `import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Load Support Board Widget
    window.SupportBoardConfig = {
      position: '${position}',
      primaryColor: '${primaryColor}',
      greeting: '${greeting}',
      buttonText: '${buttonText}',
      enableAI: ${enableAI},${customDataString}
    };

    const script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      const widgetElement = document.getElementById('support-board-widget');
      if (widgetElement) widgetElement.remove();
    };
  }, []);

  return (
    <div>
      <h1>Your React App</h1>
      {/* Widget will be injected automatically */}
    </div>
  );
}

export default App;`;
  };

  const copyToClipboard = async (text: string, type: 'script' | 'html' | 'react') => {
    // Prevent copy if JSON is invalid
    if (jsonError) {
      toast({
        title: "Cannot copy code",
        description: "Please fix the custom data JSON errors first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({
        title: "Copied!",
        description: "Code has been copied to clipboard",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="title-widget-setup">
          Widget Setup
        </h1>
        <p className="text-muted-foreground">
          Embed the customer support chat widget on your website
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Widget Configuration
              </CardTitle>
              <CardDescription>
                Customize the appearance and behavior of your chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position">Widget Position</Label>
                <Select value={position} onValueChange={(value: any) => setPosition(value)}>
                  <SelectTrigger id="position" data-testid="select-widget-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0066FF"
                    className="flex-1"
                    data-testid="input-color-hex"
                  />
                </div>
              </div>

              {/* Greeting Message */}
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Input
                  id="greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Hi! How can we help you today?"
                  data-testid="input-greeting"
                />
              </div>

              {/* Button Text */}
              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Chat with us"
                  data-testid="input-button-text"
                />
              </div>

              {/* AI Toggle */}
              <div className="flex items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAI">Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">
                    AI will help answer customer questions
                  </p>
                </div>
                <Switch
                  id="enableAI"
                  checked={enableAI}
                  onCheckedChange={setEnableAI}
                  data-testid="switch-enable-ai"
                />
              </div>

              {/* Custom Data (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="customData">Custom Data (Optional)</Label>
                <Textarea
                  id="customData"
                  value={customData}
                  onChange={(e) => handleCustomDataChange(e.target.value)}
                  placeholder='{"userId": "123", "plan": "premium"}'
                  rows={3}
                  className={`font-mono text-xs ${jsonError ? 'border-destructive' : ''}`}
                  data-testid="input-custom-data"
                />
                {jsonError ? (
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Valid JSON object to pass additional context to the chat
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how the widget will appear on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-8 min-h-[300px] border-2 border-dashed">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  Your website content
                </div>
                
                {/* Preview Widget Button */}
                <div 
                  className={`fixed ${
                    position === 'bottom-right' ? 'bottom-4 right-4' :
                    position === 'bottom-left' ? 'bottom-4 left-4' :
                    position === 'top-right' ? 'top-4 right-4' :
                    'top-4 left-4'
                  }`}
                  style={{ position: 'absolute' }}
                >
                  <Button
                    className="rounded-full shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                    size="lg"
                    data-testid="preview-widget-button"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    {buttonText}
                  </Button>
                </div>

                {/* Preview Info */}
                <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border">
                  <p className="text-xs font-medium mb-1">Widget Settings:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Position: {position}</div>
                    <div>Color: {primaryColor}</div>
                    {enableAI && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Enabled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Embed Code Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Installation Code
              </CardTitle>
              <CardDescription>
                Copy and paste this code into your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="script" data-testid="tab-script">
                    Script Tag
                  </TabsTrigger>
                  <TabsTrigger value="html" data-testid="tab-html">
                    HTML Example
                  </TabsTrigger>
                  <TabsTrigger value="react" data-testid="tab-react">
                    React
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="script" className="space-y-4">
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{generateScriptTag()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateScriptTag(), 'script')}
                      data-testid="button-copy-script"
                    >
                      {copied === 'script' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Installation Steps:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Copy the script tag above</li>
                      <li>Paste it before the closing <code>&lt;/body&gt;</code> tag</li>
                      <li>The widget will appear automatically on your site</li>
                    </ol>
                  </div>
                </TabsContent>

                <TabsContent value="html" className="space-y-4">
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[400px]">
                      <code>{generateHTMLExample()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateHTMLExample(), 'html')}
                      data-testid="button-copy-html"
                    >
                      {copied === 'html' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="react" className="space-y-4">
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[400px]">
                      <code>{generateReactExample()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateReactExample(), 'react')}
                      data-testid="button-copy-react"
                    >
                      {copied === 'react' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Advanced Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Advanced Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">AI-Powered Responses</p>
                  <p className="text-xs text-muted-foreground">
                    Smart routing to specialized AI agents with knowledge base integration
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">Session Continuity</p>
                  <p className="text-xs text-muted-foreground">
                    Customers can resume conversations across sessions and devices
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">Anonymous Support</p>
                  <p className="text-xs text-muted-foreground">
                    No login required - customers can start chatting immediately
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">Custom Context</p>
                  <p className="text-xs text-muted-foreground">
                    Pass user data for personalized, context-aware support
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Badge variant="secondary">✓</Badge>
                </div>
                <div>
                  <p className="font-medium text-sm">Real-Time Updates</p>
                  <p className="text-xs text-muted-foreground">
                    WebSocket-powered instant messaging with typing indicators
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/support" target="_blank" data-testid="link-test-widget">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Test Widget Live
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/ai-configuration" data-testid="link-configure-ai">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Configure AI Agents
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/knowledge" data-testid="link-knowledge-base">
                  <Code className="w-4 h-4 mr-2" />
                  Manage Knowledge Base
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
