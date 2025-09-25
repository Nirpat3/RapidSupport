import { CustomerChatWidget } from "@/components/CustomerChatWidget";

export default function CustomerChatPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="title-customer-support">
                Customer Support
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-support-description">
                Get instant help from our support team
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" data-testid="indicator-online"></div>
              <span className="text-sm text-muted-foreground">Support Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-card rounded-lg border p-6 mb-8" data-testid="card-welcome">
            <h2 className="text-xl font-semibold mb-4">Welcome to Support Chat</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">How it works</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                    Click the chat button to start a conversation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                    Provide your basic information for personalized support
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                    Connect with our support team instantly
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Support Hours</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                  <p>Saturday: 10:00 AM - 4:00 PM EST</p>
                  <p>Sunday: Closed</p>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-foreground mb-2">Average Response Time</h3>
                  <p className="text-sm text-muted-foreground">Less than 2 minutes during business hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-card rounded-lg border p-6" data-testid="card-faq">
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">Do I need an account to chat with support?</h3>
                <p className="text-sm text-muted-foreground">
                  No account required! Simply provide your name, business information, and contact details to get started.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Is my information secure?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, we take your privacy seriously. Your information is encrypted and only used to provide support.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Can I continue previous conversations?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! If you return from the same device, we'll automatically load your previous conversation history.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">What if no agents are available?</h3>
                <p className="text-sm text-muted-foreground">
                  You can still start a conversation and leave your message. We'll respond as soon as an agent becomes available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Chat Widget */}
      <CustomerChatWidget />
    </div>
  );
}