import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useLocation } from "wouter";
import { MessageSquare, Users, BookOpen, User, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const PALETTE_OPEN_EVENT = "nova:open-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(PALETTE_OPEN_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const openHandler = () => setOpen(true);
    const shortcutsHandler = () => {
      // Logic to show shortcuts could go here or in a separate Dialog
      setOpen(true);
      setQuery("?"); // Just an example of how to trigger a "help" state
    };

    document.addEventListener("keydown", down);
    window.addEventListener(PALETTE_OPEN_EVENT, openHandler);
    window.addEventListener("nova:open-shortcuts", shortcutsHandler);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener(PALETTE_OPEN_EVENT, openHandler);
      window.removeEventListener("nova:open-shortcuts", shortcutsHandler);
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/search", { q: query }],
    queryFn: async () => {
      if (!query) return null;
      return apiRequest(`/api/search?q=${encodeURIComponent(query)}`, "GET");
    },
    enabled: query.length > 0,
  });

  const onSelect = useCallback((url: string) => {
    setOpen(false);
    setLocation(url);
  }, [setLocation]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <CommandEmpty>No results found.</CommandEmpty>

        {data?.conversations?.length > 0 && (
          <CommandGroup heading="Conversations">
            {data.conversations.map((convo: any) => (
              <CommandItem
                key={convo.id}
                onSelect={() => onSelect(`/conversations/${convo.id}`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>{convo.title || "Untitled Conversation"}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {convo.customerName}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.customers?.length > 0 && (
          <CommandGroup heading="Customers">
            {data.customers.map((customer: any) => (
              <CommandItem
                key={customer.id}
                onSelect={() => onSelect(`/customers/${customer.id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{customer.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {customer.email}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.articles?.length > 0 && (
          <CommandGroup heading="Knowledge Base">
            {data.articles.map((article: any) => (
              <CommandItem
                key={article.id}
                onSelect={() => onSelect(`/knowledge/${article.id}`)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <span>{article.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data?.users?.length > 0 && (
          <CommandGroup heading="Users">
            {data.users.map((user: any) => (
              <CommandItem
                key={user.id}
                onSelect={() => onSelect(`/user-management/${user.id}`)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{user.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {user.role}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => onSelect("/conversations")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>New Conversation</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">N</span>
            </kbd>
          </CommandItem>
          <CommandItem onSelect={() => setOpen(false)}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">?</span>
            </kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
