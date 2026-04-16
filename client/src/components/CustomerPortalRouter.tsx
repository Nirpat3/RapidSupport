import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import CustomerPortalDashboard from "@/pages/CustomerPortalDashboard";
import CustomerPortalFeed from "@/pages/CustomerPortalFeed";
import CustomerPortalProfile from "@/pages/CustomerPortalProfile";
import CustomerPortalConversations from "@/pages/CustomerPortalConversations";
import CustomerPortalFeedback from "@/pages/CustomerPortalFeedback";
import CustomerPortalKnowledgeBase from "@/pages/CustomerPortalKnowledgeBase";
import CustomerPortalArticlePage from "@/pages/CustomerPortalArticlePage";
import CustomerPortalChat from "@/pages/CustomerPortalChat";
import CustomerPortalTickets from "@/pages/CustomerPortalTickets";
import CustomerPortalTicketDetail from "@/pages/CustomerPortalTicketDetail";
import CommAnnouncements from "@/pages/portal-communication/CommAnnouncements";
import CommFeed from "@/pages/portal-communication/CommFeed";
import CommCommunity from "@/pages/portal-communication/CommCommunity";
import CommMessages from "@/pages/portal-communication/CommMessages";

export function CustomerPortalRouter() {
  return (
    <Switch>
      <Route path="/portal/dashboard" component={CustomerPortalDashboard} />
      <Route path="/portal/profile" component={CustomerPortalProfile} />
      <Route path="/portal/conversations" component={CustomerPortalConversations} />
      <Route path="/portal/chat/:conversationId" component={CustomerPortalChat} />
      <Route path="/portal/chat" component={CustomerPortalChat} />
      <Route path="/portal/tickets/:id" component={CustomerPortalTicketDetail} />
      <Route path="/portal/tickets" component={CustomerPortalTickets} />
      <Route path="/portal/feedback" component={CustomerPortalFeedback} />
      <Route path="/portal/feeds" component={CustomerPortalFeed} />
      <Route path="/portal/articles/:id" component={CustomerPortalArticlePage} />
      <Route path="/portal/knowledge-base" component={CustomerPortalKnowledgeBase} />
      
      {/* Communication Routes */}
      <Route path="/portal/communication/announcements" component={CommAnnouncements} />
      <Route path="/portal/communication/feed" component={CommFeed} />
      <Route path="/portal/communication/community" component={CommCommunity} />
      <Route path="/portal/communication/messages" component={CommMessages} />
      <Route path="/portal/communication">
        {() => {
          const [_, setLocation] = useLocation();
          useEffect(() => {
            setLocation('/portal/communication/announcements');
          }, []);
          return null;
        }}
      </Route>

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
