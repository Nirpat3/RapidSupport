import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2, Users, MessageSquare, Megaphone, Send, Plus,
  ChevronRight, Link as LinkIcon, ArrowRightLeft, Pin, AlertCircle,
  RefreshCw, Trash2, ChevronDown, ChevronUp, Reply
} from "lucide-react";

function useCustomerSession() {
  const { data } = useQuery<any>({ queryKey: ['/api/customer/me'] });
  return data;
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"post" | "announcement">("post");
  const [isUrgent, setIsUrgent] = useState(false);
  const [composing, setComposing] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/org-social/org', orgId, 'posts'],
    queryFn: () => apiRequest('GET', `/api/org-social/org/${orgId}/posts`).then(r => r.json()),
    enabled: !!orgId,
  });

  const createPost = useMutation({
    mutationFn: (body: any) => apiRequest('POST', `/api/org-social/org/${orgId}/posts`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-social/org', orgId, 'posts'] });
      setNewContent(""); setNewTitle(""); setComposing(false);
      toast({ title: "Posted successfully" });
    },
    onError: (err: any) => toast({ title: "Failed to post", description: err.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: (postId: string) => apiRequest('DELETE', `/api/org-social/org/${orgId}/posts/${postId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/org-social/org', orgId, 'posts'] }),
  });

  const { data: replies = {} } = useQuery<Record<string, any[]>>({
    queryKey: ['/api/org-social/replies', orgId],
    queryFn: async () => {
      const expanded = Array.from(expandedReplies);
      if (!expanded.length) return {};
      const results = await Promise.all(
        expanded.map(id => apiRequest('GET', `/api/org-social/posts/${id}/replies`).then(r => r.json()))
      );
      return Object.fromEntries(expanded.map((id, i) => [id, results[i]]));
    },
    enabled: expandedReplies.size > 0,
  });

  const addReply = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest('POST', `/api/org-social/posts/${postId}/replies`, { content }).then(r => r.json()),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-social/replies', orgId] });
      setReplyContent(prev => ({ ...prev, [postId]: "" }));
    },
  });

  const toggleReplies = (postId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {isAdmin && !composing && (
        <Button variant="outline" onClick={() => setComposing(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      )}

      {composing && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={newType === "post" ? "default" : "outline"} onClick={() => setNewType("post")}>Post</Button>
              {isAdmin && <Button size="sm" variant={newType === "announcement" ? "default" : "outline"} onClick={() => setNewType("announcement")}>Announcement</Button>}
            </div>
            {newType === "announcement" && (
              <Input placeholder="Title (optional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            )}
            <Textarea
              placeholder={newType === "announcement" ? "Write an announcement for your organization..." : "What's on your mind?"}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
            />
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} id="urgent" />
                <Label htmlFor="urgent" className="text-sm">Mark as urgent</Label>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createPost.mutate({ type: newType, title: newTitle || undefined, content: newContent, isUrgent })}
                disabled={!newContent.trim() || createPost.isPending}>
                {createPost.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No posts yet</p>
          <p className="text-sm mt-1">Be the first to post something for your organization.</p>
        </div>
      ) : (
        posts.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback className="text-xs">{(post.author_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{post.author_name || 'Unknown'}</span>
                      {post.type === 'announcement' && <Badge variant="secondary" className="text-xs">Announcement</Badge>}
                      {post.is_pinned && <Badge variant="outline" className="text-xs gap-1"><Pin className="h-3 w-3" />Pinned</Badge>}
                      {post.is_urgent && <Badge className="text-xs bg-destructive gap-1"><AlertCircle className="h-3 w-3" />Urgent</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    </div>
                    {post.title && <p className="font-semibold mb-1">{post.title}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button size="icon" variant="ghost" className="shrink-0 h-7 w-7" onClick={() => deletePost.mutate(post.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="mt-3 ml-11 flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => toggleReplies(post.id)}>
                  <Reply className="h-3.5 w-3.5" />
                  {post.reply_count_actual || 0} {expandedReplies.has(post.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>

              {expandedReplies.has(post.id) && (
                <div className="mt-2 ml-11 space-y-2">
                  {(replies[post.id] || []).map((r: any) => (
                    <div key={r.id} className="flex gap-2 items-start">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-xs">{(r.author_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-md px-3 py-2 text-sm flex-1">
                        <span className="font-medium mr-2">{r.author_name}</span>
                        <span className="text-muted-foreground">{r.content}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a reply..."
                      className="h-8 text-sm"
                      value={replyContent[post.id] || ""}
                      onChange={e => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && replyContent[post.id]?.trim()) {
                          addReply.mutate({ postId: post.id, content: replyContent[post.id] });
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => addReply.mutate({ postId: post.id, content: replyContent[post.id] })}
                      disabled={!replyContent[post.id]?.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ orgId, currentCustomerId, onOpenDM }: { orgId: string; currentCustomerId: string; onOpenDM: (m: any) => void }) {
  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/org-social/org', orgId, 'members'],
    queryFn: () => apiRequest('GET', `/api/org-social/org/${orgId}/members`).then(r => r.json()),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No members found</p>
        </div>
      ) : (
        members.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-md hover-elevate">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{(m.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            <Badge variant={m.customer_org_role === 'admin' ? 'default' : 'secondary'} className="text-xs shrink-0">
              {m.customer_org_role || 'member'}
            </Badge>
            {m.id !== currentCustomerId && (
              <Button size="sm" variant="outline" onClick={() => onOpenDM(m)}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Messages Tab ──────────────────────────────────────────────────────────────
function MessagesTab({ orgId, currentCustomerId }: { orgId: string; currentCustomerId: string }) {
  const queryClient = useQueryClient();
  const [activeMember, setActiveMember] = useState<any>(null);
  const [messageContent, setMessageContent] = useState("");

  const { data: inbox = [] } = useQuery<any[]>({
    queryKey: ['/api/org-social/org', orgId, 'dm-inbox'],
    queryFn: () => apiRequest('GET', `/api/org-social/org/${orgId}/dm-inbox`).then(r => r.json()),
    enabled: !!orgId,
    refetchInterval: 10000,
  });

  const { data: thread = [] } = useQuery<any[]>({
    queryKey: ['/api/org-social/org', orgId, 'dm', activeMember?.id],
    queryFn: () => apiRequest('GET', `/api/org-social/org/${orgId}/dm/${activeMember.id}`).then(r => r.json()),
    enabled: !!activeMember,
    refetchInterval: 5000,
  });

  const sendDM = useMutation({
    mutationFn: () => apiRequest('POST', `/api/org-social/org/${orgId}/dm/${activeMember.id}`, { content: messageContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-social/org', orgId, 'dm', activeMember.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/org-social/org', orgId, 'dm-inbox'] });
      setMessageContent("");
    },
  });

  return (
    <div className="flex gap-3 h-[500px]">
      {/* Thread list */}
      <div className="w-48 shrink-0 border-r pr-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Conversations</p>
        <div className="space-y-1">
          {inbox.length === 0 && <p className="text-xs text-muted-foreground">No messages yet</p>}
          {inbox.map((thread: any) => (
            <button
              key={thread.partner_id}
              className={`w-full text-left flex items-center gap-2 p-2 rounded-md hover-elevate ${activeMember?.id === thread.partner_id ? 'bg-accent' : ''}`}
              onClick={() => setActiveMember({ id: thread.partner_id, name: thread.partner_name })}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{(thread.partner_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{thread.partner_name}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(thread.last_at), { addSuffix: true })}</p>
              </div>
              {thread.unread_count > 0 && (
                <Badge className="h-4 text-xs px-1 min-w-[1rem]">{thread.unread_count}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col">
        {!activeMember ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation or start a new one from the Members tab</p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b pb-2 mb-3 flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{(activeMember.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="font-medium text-sm">{activeMember.name}</p>
            </div>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-3">
                {thread.map((msg: any) => {
                  const isMe = msg.from_customer_id === currentCustomerId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder="Type a message..."
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                rows={2}
                className="resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && messageContent.trim()) {
                    e.preventDefault();
                    sendDM.mutate();
                  }
                }}
              />
              <Button onClick={() => sendDM.mutate()} disabled={!messageContent.trim() || sendDM.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Transfer Dialog ────────────────────────────────────────────────────────────
function TransferDialog({ orgId, open, onOpenChange }: { orgId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState("");
  const [note, setNote] = useState("");
  const [includeConversations, setIncludeConversations] = useState(true);
  const [includeTickets, setIncludeTickets] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);

  const initTransfer = useMutation({
    mutationFn: () => apiRequest('POST', '/api/business-transfer/initiate', {
      customerOrgId: orgId, toEmail, transferNote: note,
      includeConversations, includeTickets, includeMembers,
    }).then(r => r.json()),
    onSuccess: (data) => {
      toast({ title: "Transfer initiated", description: `An invitation was prepared for ${toEmail}. Share the transfer link with them.` });
      if (data.transferToken) {
        const link = `${window.location.origin}/portal/accept-transfer/${data.transferToken}`;
        navigator.clipboard.writeText(link).catch(() => {});
        toast({ title: "Transfer link copied to clipboard", description: link });
      }
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Failed to initiate transfer", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Business Ownership</DialogTitle>
          <CardDescription>Transfer admin rights and all associated data to a new owner. This action is audited and reversible only by support.</CardDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>New Owner's Email</Label>
            <Input placeholder="newowner@example.com" value={toEmail} onChange={e => setToEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Transfer Note (optional)</Label>
            <Textarea placeholder="Reason for transfer, special instructions..." value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 border rounded-md p-3">
            <p className="text-sm font-medium">Include in transfer</p>
            <div className="space-y-2">
              {[
                { label: "Conversation history", state: includeConversations, set: setIncludeConversations, id: "conv" },
                { label: "Support tickets", state: includeTickets, set: setIncludeTickets, id: "tick" },
                { label: "Organization members", state: includeMembers, set: setIncludeMembers, id: "mem" },
              ].map(({ label, state, set, id }) => (
                <div key={id} className="flex items-center gap-2">
                  <Switch checked={state} onCheckedChange={set} id={id} />
                  <Label htmlFor={id} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => initTransfer.mutate()} disabled={!toEmail.trim() || initTransfer.isPending} variant="destructive">
            {initTransfer.isPending ? "Processing..." : "Initiate Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main OrgHub Page ──────────────────────────────────────────────────────────
export default function CustomerPortalOrgHub() {
  const customer = useCustomerSession();
  const orgId = customer?.customerOrganizationId;
  const isAdmin = customer?.customerOrgRole === 'admin';
  const [transferOpen, setTransferOpen] = useState(false);
  const [dmMember, setDmMember] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("announcements");

  const { data: orgInfo } = useQuery<any>({
    queryKey: ['/api/org-social/org', orgId],
    queryFn: () => apiRequest('GET', `/api/org-social/org/${orgId}`).then(r => r.json()),
    enabled: !!orgId,
  });

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-xl font-semibold mb-2">No Organization</h2>
        <p className="text-muted-foreground max-w-sm">You are not part of a customer organization yet. Contact your administrator to be added to one.</p>
      </div>
    );
  }

  const handleOpenDM = (member: any) => {
    setDmMember(member);
    setActiveTab("messages");
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{orgInfo?.name || 'Organization Hub'}</h1>
              <p className="text-sm text-muted-foreground">
                {orgInfo?.member_count || 0} member{orgInfo?.member_count !== 1 ? 's' : ''}
                {orgInfo?.industry ? ` · ${orgInfo.industry}` : ''}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} className="gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Ownership
              </Button>
            </div>
          )}
        </div>

        {/* External identifiers banner (admin only) */}
        {isAdmin && (orgInfo?.store_id || orgInfo?.client_id || orgInfo?.external_workspace_id) && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                {orgInfo.store_id && <Badge variant="outline">Store: {orgInfo.store_id}</Badge>}
                {orgInfo.client_id && <Badge variant="outline">Client: {orgInfo.client_id}</Badge>}
                {orgInfo.external_workspace_id && <Badge variant="outline">Workspace: {orgInfo.external_workspace_id}</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">External app identifiers</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" /> Members
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="mt-4">
            <AnnouncementsTab orgId={orgId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <MembersTab orgId={orgId} currentCustomerId={customer?.id} onOpenDM={handleOpenDM} />
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <MessagesTab orgId={orgId} currentCustomerId={customer?.id} />
          </TabsContent>
        </Tabs>

        <TransferDialog orgId={orgId} open={transferOpen} onOpenChange={setTransferOpen} />
      </div>
    </div>
  );
}
