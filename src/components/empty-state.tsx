type EmptyStateProps = {
  icon: "pipeline" | "contacts" | "interviews" | "documents" | "tasks" | "analytics" | "generic";
  message: string;
  action?: React.ReactNode;
};

const illustrations: Record<string, string> = {
  pipeline: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="30" width="25" height="60" rx="4" fill="#e2e8f0"/>
    <rect x="45" y="30" width="25" height="45" rx="4" fill="#cbd5e1"/>
    <rect x="80" y="30" width="25" height="30" rx="4" fill="#94a3b8"/>
    <circle cx="22" cy="45" r="4" fill="#94a3b8"/>
    <circle cx="57" cy="45" r="4" fill="#64748b"/>
    <circle cx="92" cy="45" r="4" fill="#475569"/>
    <rect x="18" y="55" width="8" height="3" rx="1" fill="#94a3b8"/>
    <rect x="53" y="55" width="8" height="3" rx="1" fill="#64748b"/>
    <rect x="88" y="55" width="8" height="3" rx="1" fill="#475569"/>
  </svg>`,
  contacts: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="40" r="18" fill="#e2e8f0"/>
    <path d="M30 95c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="#e2e8f0"/>
    <circle cx="95" cy="35" r="12" fill="#cbd5e1"/>
    <path d="M80 85c0-11 9-20 20-20s20 9 20 20" fill="#cbd5e1"/>
  </svg>`,
  interviews: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="25" width="80" height="55" rx="6" fill="#e2e8f0"/>
    <circle cx="60" cy="48" r="10" fill="#94a3b8"/>
    <path d="M45 70c0-8 7-15 15-15s15 7 15 15" fill="#94a3b8"/>
    <rect x="35" y="85" width="50" height="4" rx="2" fill="#cbd5e1"/>
    <rect x="45" y="93" width="30" height="3" rx="1.5" fill="#cbd5e1"/>
  </svg>`,
  documents: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="20" width="50" height="65" rx="4" fill="#e2e8f0"/>
    <rect x="42" y="32" width="36" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="42" y="40" width="36" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="42" y="48" width="24" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="42" y="58" width="36" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="42" y="66" width="28" height="3" rx="1.5" fill="#cbd5e1"/>
    <path d="M70 20l15 15v-15h-15z" fill="#cbd5e1"/>
  </svg>`,
  tasks: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="25" width="70" height="70" rx="6" fill="#e2e8f0"/>
    <rect x="35" y="38" width="6" height="6" rx="1" fill="#94a3b8"/>
    <rect x="35" y="52" width="6" height="6" rx="1" fill="#94a3b8"/>
    <rect x="35" y="66" width="6" height="6" rx="1" fill="#94a3b8"/>
    <rect x="47" y="40" width="35" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="47" y="54" width="35" height="3" rx="1.5" fill="#cbd5e1"/>
    <rect x="47" y="68" width="25" height="3" rx="1.5" fill="#cbd5e1"/>
  </svg>`,
  analytics: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="60" width="15" height="35" rx="2" fill="#e2e8f0"/>
    <rect x="42" y="45" width="15" height="50" rx="2" fill="#cbd5e1"/>
    <rect x="64" y="35" width="15" height="60" rx="2" fill="#94a3b8"/>
    <rect x="86" y="50" width="15" height="45" rx="2" fill="#cbd5e1"/>
  </svg>`,
  generic: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="35" fill="#e2e8f0"/>
    <rect x="50" y="50" width="20" height="20" rx="4" fill="#cbd5e1"/>
  </svg>`,
};

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div
        className="mb-3 opacity-60"
        dangerouslySetInnerHTML={{ __html: illustrations[icon] ?? illustrations.generic }}
      />
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
