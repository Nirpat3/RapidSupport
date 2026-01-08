import { Switch, Route } from "wouter";
import CustomerPortalDashboard from "@/pages/CustomerPortalDashboard";
import CustomerPortalFeed from "@/pages/CustomerPortalFeed";
import CustomerPortalProfile from "@/pages/CustomerPortalProfile";
import CustomerPortalConversations from "@/pages/CustomerPortalConversations";
import CustomerPortalFeedback from "@/pages/CustomerPortalFeedback";
import CustomerPortalKnowledgeBase from "@/pages/CustomerPortalKnowledgeBase";
import CustomerPortalArticlePage from "@/pages/CustomerPortalArticlePage";
import CustomerPortalChat from "@/pages/CustomerPortalChat";

export function CustomerPortalRouter() {
  return (
    <Switch>
      <Route path="/portal/dashboard" component={CustomerPortalDashboard} />
      <Route path="/portal/profile" component={CustomerPortalProfile} />
      <Route path="/portal/conversations" component={CustomerPortalConversations} />
      <Route path="/portal/chat/:conversationId" component={CustomerPortalChat} />
      <Route path="/portal/chat" component={CustomerPortalChat} />
      <Route path="/portal/feedback" component={CustomerPortalFeedback} />
      <Route path="/portal/feeds" component={CustomerPortalFeed} />
      <Route path="/portal/articles/:id" component={CustomerPortalArticlePage} />
      <Route path="/portal/knowledge-base" component={CustomerPortalKnowledgeBase} />
      {/* Default redirect to dashboard */}
      <Route path="/portal" component={CustomerPortalDashboard} />
      <Route>
        {() => {
          window.location.href = '/portal/dashboard';
          return null;
        }}
      </Route>
    </Switch>
  );
}
