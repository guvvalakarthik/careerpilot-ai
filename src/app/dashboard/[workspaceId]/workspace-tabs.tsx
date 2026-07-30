"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  FileTextIcon,
  GearIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  NavigationArrowIcon,
  NotePencilIcon,
  SignOutIcon,
  SparkleIcon,
  StarIcon,
  UserCircleIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { signOutAction } from "@/components/actions";
import { NotificationBell } from "@/components/notification-bell";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AnalyticsTab } from "./analytics-tab";
import { AssistantTab } from "./assistant-tab";
import { ContactsTab } from "./contacts-tab";
import { DocumentsTab } from "./documents-tab";
import { MembersTab } from "./members-tab";
import { OpportunityIntelligence } from "./opportunity-intelligence";
import { PipelineTab } from "./pipeline-tab";
import { SettingsTab } from "./settings-tab";
import { UpcomingTab } from "./upcoming-tab";
import styles from "./workspace.module.css";

type Member = { id: string; role: string; createdAt: string; user: { id: string; name: string | null; email: string; image: string | null } };
type Stats = { companies: number; opportunities: number; applications: number; contacts: number; interviews: number; tasks: number };
type NavId = "overview" | "opportunities" | "applications" | "resume" | "interview" | "network" | "insights" | "assistant" | "members" | "settings";

const nav: Array<{ id: NavId; label: string; icon: typeof HouseIcon }> = [
  { id: "overview", label: "Overview", icon: HouseIcon },
  { id: "opportunities", label: "Opportunities", icon: BriefcaseIcon },
  { id: "applications", label: "Applications", icon: FileTextIcon },
  { id: "resume", label: "Resume Lab", icon: NotePencilIcon },
  { id: "interview", label: "Interview Prep", icon: MicrophoneStageIcon },
  { id: "network", label: "Network", icon: UsersThreeIcon },
  { id: "insights", label: "Insights", icon: ChartLineUpIcon },
];

const titles: Record<NavId, [string, string]> = {
  overview: ["Career overview", "A clear view of your job-search momentum."],
  opportunities: ["Opportunity Intelligence", "High-fit roles, researched and ranked for you."],
  applications: ["Applications", "Move every active application forward."],
  resume: ["Resume Lab", "Keep every tailored document organized."],
  interview: ["Interview Prep", "Prepare for upcoming conversations and deadlines."],
  network: ["Network", "Build relationships around the roles that matter."],
  insights: ["Insights", "See patterns across your search."],
  assistant: ["AI Assistant", "Ask questions across your career workspace."],
  members: ["Members", "Manage the people supporting this search."],
  settings: ["Workspace settings", "Control access and preferences."],
};

function Overview({ stats, onStartTailoring }: { stats: Stats; onStartTailoring: () => void }) {
  const cards = [
    ["Opportunities", stats.opportunities, "Roles captured", BriefcaseIcon],
    ["Active applications", stats.applications, "Across your pipeline", FileTextIcon],
    ["Interview momentum", stats.interviews, "Scheduled interviews", MicrophoneStageIcon],
    ["Network contacts", stats.contacts, "People in your network", UsersThreeIcon],
  ] as const;
  return (
    <div className={styles.overview}>
      {cards.map(([label, value, note, Icon]) => <article key={label}><span><Icon weight="duotone" /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}
      <section><span><SparkleIcon weight="fill" /></span><div><small>Recommended next move</small><h3>Tailor your highest-fit application</h3><p>Open Opportunity Intelligence to compare fit evidence and create a persistent tailoring task.</p></div><button onClick={onStartTailoring}>Choose an application <ArrowRightIcon /></button></section>
    </div>
  );
}

function Legacy({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className={styles.legacy}><header><h2>{title}</h2><p>{subtitle}</p></header><div>{children}</div></section>;
}

export function WorkspaceTabs({ workspaceId, workspaceName, workspaceSlug, role, currentUserId, userName, userEmail, members, stats }: { workspaceId: string; workspaceName: string; workspaceSlug: string; role: string; currentUserId: string; userName: string; userEmail: string; members: Member[]; stats: Stats }) {
  const [tab, setTab] = useState<NavId>("opportunities");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [focusedApplicationId, setFocusedApplicationId] = useState<string | null>(null);
  useKeyboardShortcuts();
  const [title, subtitle] = titles[tab];
  const selectTab = (id: NavId) => { setTab(id); setMobile(false); };
  const openApplication = (applicationId: string) => {
    setFocusedApplicationId(applicationId);
    selectTab("applications");
  };

  return <div className={styles.app}>
    <aside className={`${styles.sidebar} ${mobile ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}><span><NavigationArrowIcon weight="fill" /></span><strong>CareerPilot AI</strong><button onClick={() => setMobile(false)} aria-label="Close navigation"><XIcon /></button></div>
      <nav>{nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => selectTab(item.id)} className={tab === item.id ? styles.navActive : ""} aria-current={tab === item.id ? "page" : undefined}><Icon weight={tab === item.id ? "fill" : "regular"}/>{item.label}</button>; })}</nav>
      <div className={styles.sideBottom}>
        <section><StarIcon weight="fill" /><div><strong>Production workspace</strong><p>Persistent tracking, research, and application actions.</p></div><CaretRightIcon /></section>
        <Link href="/dashboard"><span>{workspaceName.slice(0,1).toUpperCase()}</span><div><h2>{workspaceName}</h2><small>{workspaceSlug}</small></div><CaretRightIcon /></Link>
        <div className={styles.sideProfile}>
          <button onClick={() => setProfile((value) => !value)} aria-expanded={profile}>
            <span className={styles.sideUserAvatar}>{(userName || userEmail || "U").slice(0, 1).toUpperCase()}</span>
            <span><strong>{userName || userEmail || "User"}</strong><small>{userEmail}</small></span>
            <CaretDownIcon />
          </button>
          {profile ? <div className={`${styles.popover} ${styles.sidePopover}`}><header><strong>{userName || "User"}</strong><span>{userEmail}</span></header><Link href="/dashboard/profile"><UserCircleIcon />Profile</Link><button onClick={() => selectTab("assistant")}><SparkleIcon />AI Assistant</button><button onClick={() => selectTab("members")}><UsersThreeIcon />Members</button><button onClick={() => selectTab("settings")}><GearIcon />Settings</button><form action={signOutAction}><button><SignOutIcon />Sign out</button></form></div> : null}
        </div>
      </div>
    </aside>
    {mobile ? <button className={styles.backdrop} onClick={() => setMobile(false)} aria-label="Close navigation" /> : null}
    <div className={styles.main}>
      <header className={styles.topbar}><button className={styles.menu} onClick={() => setMobile(true)} aria-label="Open navigation"><NavigationArrowIcon /></button><div className={styles.title}><h1>{title}</h1><p>{subtitle}</p></div><label className={styles.search}><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles, companies, or skills" aria-label="Search workspace"/><kbd>/</kbd></label><NotificationBell /></header>
      <main className={styles.content}>
        {tab === "opportunities" ? <OpportunityIntelligence workspaceId={workspaceId} query={query} onOpenApplication={openApplication} onOpenInsights={() => selectTab("insights")} onOpenNetwork={() => selectTab("network")} /> : null}
        {tab === "overview" ? <Overview stats={stats} onStartTailoring={() => selectTab("opportunities")} /> : null}
        {tab === "applications" ? <Legacy title={title} subtitle={subtitle}><PipelineTab workspaceId={workspaceId} initialApplicationId={focusedApplicationId}/></Legacy> : null}
        {tab === "resume" ? <Legacy title={title} subtitle={subtitle}><DocumentsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "interview" ? <Legacy title={title} subtitle={subtitle}><UpcomingTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "network" ? <Legacy title={title} subtitle={subtitle}><ContactsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "insights" ? <Legacy title={title} subtitle={subtitle}><AnalyticsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "assistant" ? <Legacy title={title} subtitle={subtitle}><AssistantTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "members" ? <Legacy title={title} subtitle={subtitle}><MembersTab workspaceId={workspaceId} role={role} currentUserId={currentUserId} members={members}/></Legacy> : null}
        {tab === "settings" ? <Legacy title={title} subtitle={subtitle}><SettingsTab workspaceId={workspaceId} workspaceName={workspaceName} role={role} members={members}/></Legacy> : null}
      </main>
    </div>
  </div>;
}