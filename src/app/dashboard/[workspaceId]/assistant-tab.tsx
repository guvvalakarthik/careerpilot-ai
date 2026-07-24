"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, AlertCircle, Bot, User } from "lucide-react";
import { api } from "@/trpc/react";

type Message = {
  role: "user" | "model";
  content: string;
};

const SUGGESTIONS = [
  "Which applications have I not heard back from?",
  "Draft a follow-up email for my most recent application",
  "Prep me for my upcoming interview",
  "What should I prioritize this week?",
];

export function AssistantTab({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: aiStatus } = api.ai.status.useQuery({ workspaceId });

  const chatMutation = api.ai.assistantChat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "model", content: data.response }]);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function send(message: string) {
    if (!message.trim() || chatMutation.isPending) return;
    setError(null);
    const userMsg: Message = { role: "user", content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    chatMutation.mutate({ workspaceId, messages: newMessages });
  }

  if (aiStatus && !aiStatus.configured) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-6 w-6 text-amber-600" />
        <p className="mt-2 text-sm font-medium text-amber-700">AI not configured</p>
        <p className="mt-1 text-xs text-amber-600">
          Set <code className="rounded bg-amber-100 px-1">GOOGLE_GENERATIVE_AI_API_KEY</code> in your .env file to enable the AI assistant.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">CareerPilot Assistant</p>
          <p className="text-xs text-slate-400">Context-aware AI with your workspace data</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Bot className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">Ask me anything about your job search.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={"flex gap-2 " + (msg.role === "user" ? "flex-row-reverse" : "")}>
              <div className={"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full " + (msg.role === "user" ? "bg-slate-200" : "bg-gradient-to-br from-purple-500 to-blue-500")}>
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-slate-600" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div className={"max-w-[80%] rounded-xl px-3 py-2 text-sm " + (msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {chatMutation.isPending && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your applications, interviews, tasks..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          <button
            onClick={() => send(input)}
            disabled={chatMutation.isPending || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
