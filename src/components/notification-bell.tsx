"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Clock, Calendar, AlertTriangle, Info } from "lucide-react";
import { api } from "@/trpc/react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
  workspace: { name: string } | null;
};

const typeConfig: Record<string, { icon: typeof Clock; color: string }> = {
  TASK_DUE: { icon: Clock, color: "text-blue-600" },
  INTERVIEW_UPCOMING: { icon: Calendar, color: "text-purple-600" },
  APPLICATION_STALE: { icon: AlertTriangle, color: "text-amber-600" },
  DEADLINE_APPROACHING: { icon: AlertTriangle, color: "text-orange-600" },
  SYSTEM: { icon: Info, color: "text-slate-500" },
};

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const { data: unreadCount } = api.notification.unreadCountAll.useQuery({}, {
    refetchInterval: 30000,
  });

  const { data: notifications } = api.notification.listAll.useQuery(
    {},
    { enabled: open },
  );

  const markReadMutation = api.notification.markReadAll.useMutation({
    onSuccess: () => {
      utils.notification.unreadCountAll.invalidate({});
      utils.notification.listAll.invalidate({});
    },
  });

  const markAllReadMutation = api.notification.markAllReadAll.useMutation({
    onSuccess: () => {
      utils.notification.unreadCountAll.invalidate({});
      utils.notification.listAll.invalidate({});
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifs = (notifications ?? []) as unknown as Notification[];
  const count = unreadCount ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </span>
            {count > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate({})}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-300"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const config = typeConfig[n.type] ?? typeConfig.SYSTEM;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={"flex gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 " + (n.readAt ? "opacity-60" : "")}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <Icon className={"h-4 w-4 " + config.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {n.title.replace(/\s*\[.*?\]\s*$/, "")}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {timeAgo(n.createdAt)}
                        </span>
                        {n.workspace && (
                          <span className="text-[10px] text-slate-400">
                            - {n.workspace.name}
                          </span>
                        )}
                        {!n.readAt && (
                          <button
                            onClick={() => markReadMutation.mutate({ notificationId: n.id })}
                            disabled={markReadMutation.isPending}
                            className="ml-auto text-[10px] font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-300"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                    {!n.readAt && (
                      <div className="flex-shrink-0 pt-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
