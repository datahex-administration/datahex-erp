"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  Hash,
  Users,
  MessageSquare,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<AnyObj[]>([]);
  const [activeChannel, setActiveChannel] = useState<AnyObj | null>(null);
  const [messages, setMessages] = useState<AnyObj[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<AnyObj[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: "", type: "group", members: [] as string[] });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/channels").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([c, u]) => {
      setChannels(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
      setLoadingChannels(false);
    });
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/channels/${channelId}/messages`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
    setLoadingMessages(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const selectChannel = useCallback((channel: AnyObj) => {
    setActiveChannel(channel);
    loadMessages(channel._id);
    // Start polling
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetch(`/api/channels/${channel._id}/messages`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setMessages(data);
        });
    }, 5000);
  }, [loadMessages]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return;
    setSending(true);
    const res = await fetch(`/api/channels/${activeChannel._id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage.trim() }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      // Update channel list
      setChannels((prev) =>
        prev.map((c) =>
          c._id === activeChannel._id
            ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
            : c
        )
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  };

  const createChannel = async () => {
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channelForm),
    });
    if (res.ok) {
      const ch = await res.json();
      setChannels((prev) => [ch, ...prev]);
      setDialogOpen(false);
      setChannelForm({ name: "", type: "group", members: [] });
      selectChannel(ch);
      toast.success("Channel created");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create channel");
    }
  };

  const formatMsgDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday " + format(d, "h:mm a");
    return format(d, "MMM d, h:mm a");
  };

  const channelIcon = (type: string) => {
    switch (type) {
      case "direct": return <MessageSquare className="h-4 w-4" />;
      case "project": return <FolderKanban className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  };

  const toggleMember = (userId: string) => {
    setChannelForm((f) => ({
      ...f,
      members: f.members.includes(userId)
        ? f.members.filter((m) => m !== userId)
        : [...f.members, userId],
    }));
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Channel Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border rounded-lg bg-background">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Messages</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="h-4 w-4" /></Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>New Channel</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Channel Name</Label>
                  <Input
                    value={channelForm.name}
                    onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                    placeholder="e.g., general"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={channelForm.type} onValueChange={(v) => v && setChannelForm({ ...channelForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Members</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {users.map((u) => (
                      <label key={u._id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelForm.members.includes(u._id)}
                          onChange={() => toggleMember(u._id)}
                          className="rounded"
                        />
                        <span>{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={createChannel} disabled={!channelForm.name.trim()} className="w-full">Create Channel</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          {loadingChannels ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No channels yet</p>
              <p className="text-xs">Create one to start chatting</p>
            </div>
          ) : (
            <div className="p-1">
              {channels.map((ch) => (
                <button
                  key={ch._id}
                  onClick={() => selectChannel(ch)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                    activeChannel?._id === ch._id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={activeChannel?._id === ch._id ? "text-primary-foreground/70" : "text-muted-foreground"}>
                      {channelIcon(ch.type)}
                    </span>
                    <span className="font-medium truncate">{ch.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto shrink-0 h-4 px-1">
                      {ch.members?.length || 0}
                    </Badge>
                  </div>
                  {ch.lastMessage && (
                    <p className={`text-xs truncate mt-0.5 ml-6 ${
                      activeChannel?._id === ch._id ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {ch.lastMessage}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-background overflow-hidden">
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>Select a channel to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center gap-3">
              {channelIcon(activeChannel.type)}
              <div>
                <h3 className="font-semibold text-sm">{activeChannel.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeChannel.members?.map((m: AnyObj) => m.name || m).join(", ")}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId?._id === user?.id || msg.senderId === user?.id;
                    return (
                      <div key={msg._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] ${isOwn ? "order-1" : ""}`}>
                          <div className={`rounded-lg px-3 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            {!isOwn && (
                              <p className="text-xs font-medium mb-0.5 opacity-70">
                                {msg.senderId?.name || "Unknown"}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right" : ""}`}>
                            {formatMsgDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={sending || !newMessage.trim()} size="icon">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
