"use client";


import Link from "next/link";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowRightIcon, ArrowUpRightIcon, BellIcon, BookmarkSimpleIcon, BriefcaseIcon, BuildingsIcon,
  CalendarBlankIcon, CaretDownIcon, CaretRightIcon, ChartDonutIcon, ChartLineUpIcon, CheckCircleIcon,
  DotsThreeVerticalIcon, FileTextIcon, GearIcon, HouseIcon, LinkedinLogoIcon,
  MagnifyingGlassIcon, MapPinIcon, MicrophoneStageIcon, NavigationArrowIcon,
  NotePencilIcon, SignOutIcon, SlidersHorizontalIcon, SparkleIcon, StackIcon, StarIcon,
  TrendUpIcon, UserCircleIcon, UsersThreeIcon, XIcon,
} from "@phosphor-icons/react";
import { SiAtlassian, SiRazorpay } from "react-icons/si";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { signOutAction } from "@/components/actions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AnalyticsTab } from "./analytics-tab";
import { AssistantTab } from "./assistant-tab";
import { ContactsTab } from "./contacts-tab";
import { DocumentsTab } from "./documents-tab";
import { MembersTab } from "./members-tab";
import { PipelineTab } from "./pipeline-tab";
import { SettingsTab } from "./settings-tab";
import { UpcomingTab } from "./upcoming-tab";
import styles from "./workspace.module.css";

type Member = { id: string; role: string; createdAt: string; user: { id: string; name: string | null; email: string; image: string | null } };
type Stats = { companies: number; opportunities: number; applications: number; contacts: number; interviews: number; tasks: number };
type NavId = "overview" | "opportunities" | "applications" | "resume" | "interview" | "network" | "insights" | "assistant" | "members" | "settings";
type Opportunity = { id: string; title: string; company: string; skills: string; score: number; salary: string; city: string; mode: string; posted: string; date: string; logo: "atlassian" | "razorpay" | "freshworks" | "meesho" | "browserstack" };

const jobs: Opportunity[] = [
  { id: "atlassian", title: "Product Analyst", company: "Atlassian", skills: "Product analytics · SQL · Looker · Experimentation", score: 92, salary: "₹14L – ₹22L", city: "Bengaluru", mode: "Hybrid", posted: "2d ago", date: "Jul 27, 2026", logo: "atlassian" },
  { id: "razorpay", title: "Business Analyst", company: "Razorpay", skills: "Requirements analysis · SQL · Excel · Payments", score: 86, salary: "₹10L – ₹16L", city: "Bengaluru", mode: "Hybrid", posted: "5d ago", date: "Jul 24, 2026", logo: "razorpay" },
  { id: "freshworks", title: "Junior Data Analyst", company: "Freshworks", skills: "SQL · Python · Data visualization · Dashboards", score: 81, salary: "₹6L – ₹10L", city: "Bengaluru", mode: "Hybrid", posted: "1w ago", date: "Jul 22, 2026", logo: "freshworks" },
  { id: "meesho", title: "Strategy Analyst", company: "Meesho", skills: "Market research · Excel · SQL · Strategy", score: 78, salary: "₹9L – ₹14L", city: "Bengaluru", mode: "On-site", posted: "1w ago", date: "Jul 21, 2026", logo: "meesho" },
  { id: "browserstack", title: "Product Operations Associate", company: "BrowserStack", skills: "Product ops · Analytics · SQL · Stakeholder mgmt.", score: 74, salary: "₹7L – ₹11L", city: "Bengaluru", mode: "Hybrid", posted: "1w ago", date: "Jul 20, 2026", logo: "browserstack" },
];

const market = [87, 91, 89, 94, 92, 98, 96, 104, 111, 116, 113].map((value, index) => ({ index, value }));
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
  overview: ["Career overview", "A clear view of your job-search momentum."], opportunities: ["Opportunity Intelligence", "High-fit roles, researched and ranked for you."], applications: ["Applications", "Move every active application forward."], resume: ["Resume Lab", "Keep every tailored document organized."], interview: ["Interview Prep", "Prepare for upcoming conversations and deadlines."], network: ["Network", "Build relationships around the roles that matter."], insights: ["Insights", "See patterns across your search."], assistant: ["AI Assistant", "Ask questions across your career workspace."], members: ["Members", "Manage the people supporting this search."], settings: ["Workspace settings", "Control access and preferences."],
};

function Logo({ job, large = false }: { job: Opportunity; large?: boolean }) {
  const n = large ? 56 : 44;
  const icon = large ? 31 : 24;
  if (job.logo === "atlassian") return <span className={`${styles.logo} ${styles.atlassian}`} style={{ width: n, height: n }}><SiAtlassian size={icon} /></span>;
  if (job.logo === "razorpay") return <span className={`${styles.logo} ${styles.razorpay}`} style={{ width: n, height: n }}><SiRazorpay size={icon} /></span>;
  const GenericLogo = job.logo === "freshworks" ? ChartDonutIcon : job.logo === "meesho" ? BuildingsIcon : StackIcon;
  const logoClass = job.logo === "freshworks" ? styles.freshworks : job.logo === "meesho" ? styles.meesho : styles.browserstack;
  return <span className={`${styles.logo} ${logoClass}`} style={{ width: n, height: n }}><GenericLogo size={icon} weight="duotone" /></span>;
}

function Score({ value, size = 54 }: { value: number; size?: number }) {
  const fill = value >= 80 ? "#087f79" : "#d89700";
  return <div className={styles.score} style={{ width: size, height: size }} aria-label={`${value}% match`}>
    <CircularProgressbar value={value} text={`${value}%`} strokeWidth={7} styles={buildStyles({ pathColor: fill, trailColor: "#e6eceb", textColor: "#17201f", textSize: "19px", strokeLinecap: "round" })} />
  </div>;
}

function OpportunityIntelligence({ query }: { query: string }) {
  const [feed, setFeed] = useState<"recommended" | "saved" | "tracked">("recommended");
  const [role, setRole] = useState("All");
  const [location, setLocation] = useState("Bengaluru");
  const [selectedId, setSelectedId] = useState("atlassian");
  const [saved, setSaved] = useState(() => new Set(["atlassian"]));
  const [detailOpen, setDetailOpen] = useState(true);
  const [tailored, setTailored] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0];
  const visible = useMemo(() => jobs.filter((job) => {
    if (feed === "saved" && !saved.has(job.id)) return false;
    if (feed === "tracked" && job.id !== "atlassian") return false;
    if (role !== "All" && !job.title.toLowerCase().includes(role.toLowerCase())) return false;
    if (location !== "All locations" && job.city !== location) return false;
    const text = `${job.title} ${job.company} ${job.skills}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [feed, location, query, role, saved]);

  const toggleSave = (id: string) => setSaved((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const select = (id: string) => { setSelectedId(id); setDetailOpen(true); setTailored(false); };
  const keySelect = (event: KeyboardEvent<HTMLDivElement>, id: string) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(id); } };
  const tailor = () => { setTailored(true); setNotice(`Tailored application workspace created for ${selected.company}.`); window.setTimeout(() => setNotice(""), 3200); };

  return <div className={styles.intelligence}>
    <section className={styles.results} aria-label="Opportunity results">
      <div className={styles.tabs} role="tablist">
        {(["recommended", "saved", "tracked"] as const).map((item) => <button key={item} role="tab" aria-selected={feed === item} onClick={() => setFeed(item)} className={feed === item ? styles.tabActive : styles.tab}>{item[0].toUpperCase() + item.slice(1)}{item === "saved" && saved.size ? <b>{saved.size}</b> : null}</button>)}
      </div>
      <div className={styles.filters}>
        <label><span>Role</span><select value={role} onChange={(e) => setRole(e.target.value)}><option>All</option><option>Product</option><option>Business</option><option>Data</option><option>Strategy</option></select><CaretDownIcon /></label>
        <label><span>Location</span><select value={location} onChange={(e) => setLocation(e.target.value)}><option>Bengaluru</option><option>All locations</option></select><CaretDownIcon /></label>
        <label><span>Experience</span><select defaultValue="0–3 yrs"><option>0–3 yrs</option><option>3–5 yrs</option><option>5+ yrs</option></select><CaretDownIcon /></label>
        <label><span>Remote</span><select defaultValue="Hybrid/Remote"><option>Hybrid/Remote</option><option>Remote</option><option>Any</option></select><CaretDownIcon /></label>
        <div className={styles.sort}><span>Sort by</span><label><select defaultValue="Best match"><option>Best match</option><option>Newest</option><option>Salary</option></select><CaretDownIcon /></label><button aria-label="More filters"><SlidersHorizontalIcon weight="bold" /></button></div>
      </div>
      <div className={styles.tableHead}><span>Company &amp; Role</span><span>Match</span><span>Salary (INR)</span><span>Location</span><span>Posted</span><span>Status</span></div>
      <div className={styles.jobList}>
        {visible.map((job) => <div key={job.id} role="button" tabIndex={0} aria-pressed={selected.id === job.id} className={`${styles.jobRow} ${selected.id === job.id ? styles.selected : ""}`} onClick={() => select(job.id)} onKeyDown={(event) => keySelect(event, job.id)}>
          <div className={styles.role}><Logo job={job} /><div><strong>{job.title}</strong><span>{job.company}</span><small>{job.skills}</small></div></div>
          <Score value={job.score} />
          <div className={styles.value}><strong>{job.salary}</strong><span>per annum</span></div>
          <div className={styles.value}><strong>{job.city}</strong><span>{job.mode}</span></div>
          <div className={styles.value}><strong>{job.posted}</strong><span>{job.date}</span></div>
          <div className={styles.status}><button aria-label={`${saved.has(job.id) ? "Remove" : "Save"} ${job.title}`} className={saved.has(job.id) ? styles.saved : ""} onClick={(e) => { e.stopPropagation(); toggleSave(job.id); }}><BookmarkSimpleIcon weight={saved.has(job.id) ? "fill" : "regular"} />{saved.has(job.id) ? "Saved" : "Save"}</button><button aria-label={`More actions for ${job.title}`} onClick={(e) => e.stopPropagation()}><DotsThreeVerticalIcon weight="bold" /></button></div>
        </div>)}
        {!visible.length ? <div className={styles.empty}><MagnifyingGlassIcon /><strong>No matching opportunities</strong><span>Try widening a filter or searching for another skill.</span></div> : null}
      </div>
      <div className={styles.listFooter}><span>Showing 1–{visible.length} of {feed === "saved" ? saved.size : 47} opportunities</span><div><button disabled><CaretRightIcon className={styles.previous} /></button><button className={styles.current}>1</button>{[2,3,4,5].map((n) => <button key={n}>{n}</button>)}<button><CaretRightIcon /></button></div></div>
      <div className={styles.market}><span className={styles.marketIcon}><TrendUpIcon weight="bold" /></span><div><p>Market signal: Product analytics roles in Bengaluru are <strong>up 18%</strong> this month <ArrowUpRightIcon /></p><small>Driven by demand in SaaS, fintech, and consumer internet · CareerPilot AI Market Index</small></div><div className={styles.spark}><LineChart width={184} height={62} data={market} margin={{ top: 5, right: 3, bottom: 3, left: 3 }}><XAxis hide dataKey="index" /><YAxis hide domain={[80, 120]} /><Tooltip cursor={false} contentStyle={{ fontSize: 10, borderRadius: 7 }} /><Line type="monotone" dataKey="value" stroke="#087f79" strokeWidth={2.2} dot={false} /></LineChart></div><button>View full insights <ArrowRightIcon /></button></div>
    </section>

    {detailOpen ? <aside className={styles.details} aria-label="Selected opportunity details">
      <button className={styles.close} aria-label="Close details" onClick={() => setDetailOpen(false)}><XIcon /></button>
      <div className={styles.detailHeader}><Logo job={selected} large /><div><h2>{selected.title}</h2><p>{selected.company}<CheckCircleIcon weight="fill" /></p><span><MapPinIcon />{selected.city}, Karnataka · {selected.mode}</span></div><div className={styles.detailScore}><Score value={selected.score} size={68} /><small>Match</small></div></div>
      <section className={styles.fit}><h3>Why this fits</h3><ul>
        <li><CheckCircleIcon weight="fill" /><p><strong>Strong skill overlap:</strong> 8 of 10 key skills match, including SQL, Looker, and product analytics.</p></li>
        <li><CheckCircleIcon weight="fill" /><p><strong>Relevant experience:</strong> You have 2.2 years building dashboards and running experiments in SaaS.</p></li>
        <li><CheckCircleIcon weight="fill" /><p><strong>Role alignment:</strong> Experimentation and stakeholder insights align with your recent product-led work.</p></li>
      </ul></section>
      <section className={styles.facts}><div><span>Salary range</span><strong>{selected.salary} <small>per annum</small></strong></div><div><span>Hiring signal</span><strong className={styles.signal}><ChartLineUpIcon weight="fill" />Strong</strong><small>Actively hiring</small></div><div><span>Application deadline</span><strong><CalendarBlankIcon />Sun, Aug 16, 2026</strong><small className={styles.urgent}>18 days left</small></div><div><span>Job reference</span><strong>ATL-PA-0626-1287</strong></div></section>
      <section className={styles.skills}><span>Matched skills (8)</span><div>{["SQL", "Looker", "Product Analytics", "Experimentation", "Data Visualization", "Metrics Definition", "A/B Testing", "Excel"].map((skill) => <b key={skill}>{skill}</b>)}</div><p><span>Missing skills (2)</span><small>Amplitude</small><small>Stakeholder Management</small></p></section>
      <div className={styles.actions}><button onClick={tailor}>{tailored ? <CheckCircleIcon weight="fill" /> : <SparkleIcon weight="fill" />}{tailored ? "Application tailored" : "Tailor application"}</button><button onClick={() => toggleSave(selected.id)}><BookmarkSimpleIcon weight={saved.has(selected.id) ? "fill" : "regular"} />{saved.has(selected.id) ? "Saved" : "Save role"}</button></div>
      <section className={styles.brief}><h3><SparkleIcon weight="fill" />AI research brief</h3><article><ChartLineUpIcon /><div><h4>Company momentum</h4><p>{selected.company} reported 22% revenue growth in Q1 FY26 with strong adoption of analytics and AI products, expanding its data insights capabilities.</p></div></article><article><UsersThreeIcon /><div><h4>Team context</h4><p>The Product Insights team is building self-serve analytics for 50M+ users and accelerating experimentation across product squads.</p></div></article><article><UserCircleIcon /><div><h4>Suggested outreach</h4><div className={styles.outreach}><span className={styles.contactAvatar} aria-hidden="true"><UserCircleIcon weight="fill" /></span><p><strong>Ananya Iyer <LinkedinLogoIcon weight="fill" /></strong>Senior Product Analyst<span>Works on product analytics and experimentation.</span><button>View profile <ArrowRightIcon /></button></p></div></div></article></section>
    </aside> : <button className={styles.reopen} onClick={() => setDetailOpen(true)}>Open role details <CaretRightIcon /></button>}
    {notice ? <div className={styles.toast} role="status"><CheckCircleIcon weight="fill" />{notice}</div> : null}
  </div>;
}

function Overview({ stats }: { stats: Stats }) {
  const cards = [["Opportunities", stats.opportunities || 47, "12 new this week", BriefcaseIcon], ["Active applications", stats.applications || 8, "3 need attention", FileTextIcon], ["Interview momentum", stats.interviews || 3, "Next one Friday", MicrophoneStageIcon], ["Network contacts", stats.contacts || 24, "5 warm paths", UsersThreeIcon]] as const;
  return <div className={styles.overview}>{cards.map(([label, value, note, Icon]) => <article key={label}><span><Icon weight="duotone" /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}<section><span><SparkleIcon weight="fill" /></span><div><small>Recommended next move</small><h3>Tailor your application for Atlassian</h3><p>You are a 92% match. A focused resume pass could make this your strongest application this week.</p></div><button>Start tailoring <ArrowRightIcon /></button></section></div>;
}

function Legacy({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <section className={styles.legacy}><header><h2>{title}</h2><p>{subtitle}</p></header><div>{children}</div></section>; }

export function WorkspaceTabs({ workspaceId, workspaceName, workspaceSlug, role, currentUserId, userName, userEmail, members, stats }: { workspaceId: string; workspaceName: string; workspaceSlug: string; role: string; currentUserId: string; userName: string; userEmail: string; members: Member[]; stats: Stats }) {
  const [tab, setTab] = useState<NavId>("opportunities");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(false);
  const [mobile, setMobile] = useState(false);
  useKeyboardShortcuts();
  const [title, subtitle] = titles[tab];
  const selectTab = (id: NavId) => { setTab(id); setMobile(false); };
  return <div className={styles.app}>
    <aside className={`${styles.sidebar} ${mobile ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}><span><NavigationArrowIcon weight="fill" /></span><strong>CareerPilot AI</strong><button onClick={() => setMobile(false)} aria-label="Close navigation"><XIcon /></button></div>
      <nav>{nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => selectTab(item.id)} className={tab === item.id ? styles.navActive : ""} aria-current={tab === item.id ? "page" : undefined}><Icon weight={tab === item.id ? "fill" : "regular"}/>{item.label}</button>; })}</nav>
      <div className={styles.sideBottom}>
        <section><StarIcon weight="fill" /><div><strong>Upgrade to Pro</strong><p>Unlock advanced research and autopilot.</p></div><CaretRightIcon /></section>
        <Link href="/dashboard"><span>{workspaceName.slice(0,1).toUpperCase()}</span><div><h2>{workspaceName}</h2><small>{workspaceSlug}</small></div><CaretRightIcon /></Link>
        <div className={styles.sideProfile}>
          <button onClick={() => setProfile((v) => !v)} aria-expanded={profile}>
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
      <header className={styles.topbar}><button className={styles.menu} onClick={() => setMobile(true)} aria-label="Open navigation"><NavigationArrowIcon /></button><div className={styles.title}><h1>{title}</h1><p>{subtitle}</p></div><label className={styles.search}><MagnifyingGlassIcon /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles, companies, or skills" aria-label="Search workspace"/><kbd>/</kbd></label><button className={styles.bell} aria-label="Notifications"><BellIcon /><span>3</span></button></header>
      <main className={styles.content}>
        {tab === "opportunities" ? <OpportunityIntelligence query={query} /> : null}
        {tab === "overview" ? <Overview stats={stats} /> : null}
        {tab === "applications" ? <Legacy title={title} subtitle={subtitle}><PipelineTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "resume" ? <Legacy title={title} subtitle={subtitle}><DocumentsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "interview" ? <Legacy title={title} subtitle={subtitle}><UpcomingTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "network" ? <Legacy title={title} subtitle={subtitle}><ContactsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "insights" ? <Legacy title={title} subtitle={subtitle}><AnalyticsTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "assistant" ? <Legacy title={title} subtitle={subtitle}><AssistantTab workspaceId={workspaceId}/></Legacy> : null}
        {tab === "members" ? <Legacy title={title} subtitle={subtitle}><MembersTab workspaceId={workspaceId} role={role} currentUserId={currentUserId} members={members}/></Legacy> : null}
        {tab === "settings" ? <Legacy title={title} subtitle={subtitle}><SettingsTab workspaceId={workspaceId} role={role} members={members}/></Legacy> : null}
      </main>
    </div>
  </div>;
}
