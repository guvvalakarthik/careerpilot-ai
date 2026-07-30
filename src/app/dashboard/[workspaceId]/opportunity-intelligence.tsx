"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import {
  ArrowRightIcon,
  BookmarkSimpleIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  ChartDonutIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  StackIcon,
  UserCircleIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { SiAtlassian, SiRazorpay } from "react-icons/si";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import { api } from "@/trpc/react";
import styles from "./workspace.module.css";

const PAGE_SIZE = 5;

type Feed = "recommended" | "saved" | "tracked";
type Opportunity = {
  id: string;
  applicationId: string | null;
  title: string;
  company: string;
  requiredSkills: string[];
  missingSkills: string[];
  score: number;
  salary: string;
  city: string;
  mode: string;
  experience: string;
  stage: string;
  isSaved: boolean;
  tailoringStartedAt: Date | null;
  sourceUrl: string | null;
  rawInput: string | null;
  deadline: Date | null;
  createdAt: Date;
};

function relativeDate(date: Date) {
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function splitLocation(value: string | null) {
  const [city = "Location not provided", mode = "Not specified"] = (value ?? "").split(/\s*[·•]\s*/);
  return { city: city || "Location not provided", mode: mode || "Not specified" };
}

function salaryFloor(value: string) {
  const amount = value.match(/\d+(?:\.\d+)?/);
  return amount ? Number(amount[0]) : 0;
}

function Logo({ opportunity, large = false }: { opportunity: Opportunity; large?: boolean }) {
  const size = large ? 56 : 44;
  const iconSize = large ? 31 : 24;
  const company = opportunity.company.toLowerCase();
  if (company.includes("atlassian")) {
    return <span className={`${styles.logo} ${styles.atlassian}`} style={{ width: size, height: size }}><SiAtlassian size={iconSize} /></span>;
  }
  if (company.includes("razorpay")) {
    return <span className={`${styles.logo} ${styles.razorpay}`} style={{ width: size, height: size }}><SiRazorpay size={iconSize} /></span>;
  }
  const GenericLogo = company.includes("freshworks") ? ChartDonutIcon : company.includes("meesho") ? BuildingsIcon : StackIcon;
  const logoClass = company.includes("freshworks") ? styles.freshworks : company.includes("meesho") ? styles.meesho : styles.browserstack;
  return <span className={`${styles.logo} ${logoClass}`} style={{ width: size, height: size }}><GenericLogo size={iconSize} weight="duotone" /></span>;
}

function Score({ value, size = 54 }: { value: number; size?: number }) {
  const fill = value >= 80 ? "#087f79" : "#d89700";
  return (
    <div className={styles.score} style={{ width: size, height: size }} aria-label={`${value}% match`}>
      <CircularProgressbar
        value={value}
        text={`${value}%`}
        strokeWidth={7}
        styles={buildStyles({ pathColor: fill, trailColor: "#e6eceb", textColor: "#17201f", textSize: "19px", strokeLinecap: "round" })}
      />
    </div>
  );
}

export function OpportunityIntelligence({
  workspaceId,
  query,
  onOpenApplication,
  onOpenInsights,
  onOpenNetwork,
}: {
  workspaceId: string;
  query: string;
  onOpenApplication: (applicationId: string) => void;
  onOpenInsights: () => void;
  onOpenNetwork: () => void;
}) {
  const [feed, setFeed] = useState<Feed>("recommended");
  const [role, setRole] = useState("All");
  const [location, setLocation] = useState("All locations");
  const [experience, setExperience] = useState("Any experience");
  const [remote, setRemote] = useState("Any workplace");
  const [sort, setSort] = useState("Best match");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const utils = api.useUtils();

  const { data, isLoading, error } = api.opportunity.list.useQuery({ workspaceId });

  const opportunities = useMemo<Opportunity[]>(() => (data ?? []).map((item) => {
    const parsedLocation = splitLocation(item.location);
    return {
      id: item.id,
      applicationId: item.application?.id ?? null,
      title: item.title ?? "Untitled role",
      company: item.company?.name ?? "Unknown company",
      requiredSkills: item.requiredSkills,
      missingSkills: item.application?.missingSkills ?? [],
      score: item.application?.fitScore ?? 0,
      salary: item.salaryRange ?? "Not disclosed",
      city: parsedLocation.city,
      mode: parsedLocation.mode,
      experience: item.experienceRequired ?? "Not specified",
      stage: item.application?.stage ?? "CAPTURED",
      isSaved: item.application?.isSaved ?? false,
      tailoringStartedAt: item.application?.tailoringStartedAt ?? null,
      sourceUrl: item.sourceUrl,
      rawInput: item.rawInput,
      deadline: item.applicationDeadline,
      createdAt: item.createdAt,
    };
  }), [data]);


  const roles = useMemo(() => Array.from(new Set(opportunities.map((item) => item.title.split(" ")[0]))).sort(), [opportunities]);
  const locations = useMemo(() => Array.from(new Set(opportunities.map((item) => item.city))).sort(), [opportunities]);
  const savedCount = opportunities.filter((item) => item.isSaved).length;

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = opportunities.filter((item) => {
      if (feed === "saved" && !item.isSaved) return false;
      if (feed === "tracked" && item.stage === "CAPTURED") return false;
      if (role !== "All" && !item.title.toLowerCase().includes(role.toLowerCase())) return false;
      if (location !== "All locations" && item.city !== location) return false;
      if (remote !== "Any workplace" && !item.mode.toLowerCase().includes(remote.toLowerCase())) return false;
      if (experience !== "Any experience") {
        const years = Number(item.experience.match(/\d+/)?.[0] ?? 0);
        if (experience === "0-3 years" && years > 3) return false;
        if (experience === "3-5 years" && (years < 3 || years > 5)) return false;
        if (experience === "5+ years" && years < 5) return false;
      }
      const searchable = `${item.title} ${item.company} ${item.requiredSkills.join(" ")} ${item.city}`.toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
    return filtered.sort((a, b) => {
      if (sort === "Newest") return b.createdAt.getTime() - a.createdAt.getTime();
      if (sort === "Salary") return salaryFloor(b.salary) - salaryFloor(a.salary);
      return b.score - a.score;
    });
  }, [experience, feed, location, opportunities, query, remote, role, sort]);


  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0] ?? null;

  const saveMutation = api.application.setSaved.useMutation({
    onSuccess: async (_, variables) => {
      await Promise.all([
        utils.opportunity.list.invalidate({ workspaceId }),
        utils.application.list.invalidate({ workspaceId }),
      ]);
      setNotice(variables.saved ? "Role saved to your workspace." : "Role removed from saved jobs.");
      window.setTimeout(() => setNotice(""), 2600);
    },
  });

  const tailorMutation = api.application.startTailoring.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.opportunity.list.invalidate({ workspaceId }),
        utils.application.list.invalidate({ workspaceId }),
        utils.application.get.invalidate({ workspaceId, applicationId: result.application.id }),
      ]);
      onOpenApplication(result.application.id);
    },
  });

  const toggleSave = (item: Opportunity) => {
    if (!item.applicationId || saveMutation.isPending) return;
    saveMutation.mutate({ workspaceId, applicationId: item.applicationId, saved: !item.isSaved });
  };
  const select = (id: string) => { setSelectedId(id); setDetailOpen(true); };
  const keySelect = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(id);
    }
  };
  const clearFilters = () => {
    setRole("All");
    setLocation("All locations");
    setExperience("Any experience");
    setRemote("Any workplace");
    setSort("Best match");
  };

  return (
    <div className={styles.intelligence}>
      <section className={styles.results} aria-label="Opportunity results">
        <div className={styles.tabs} role="tablist">
          {(["recommended", "saved", "tracked"] as const).map((item) => (
            <button key={item} role="tab" aria-selected={feed === item} onClick={() => setFeed(item)} className={feed === item ? styles.tabActive : styles.tab}>
              {item[0].toUpperCase() + item.slice(1)}{item === "saved" && savedCount ? <b>{savedCount}</b> : null}
            </button>
          ))}
        </div>
        <div className={styles.filters}>
          <label><span>Role</span><select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)}><option>All</option>{roles.map((item) => <option key={item}>{item}</option>)}</select><CaretDownIcon /></label>
          <label><span>Location</span><select aria-label="Location" value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select><CaretDownIcon /></label>
          <label><span>Experience</span><select aria-label="Experience" value={experience} onChange={(event) => setExperience(event.target.value)}><option>Any experience</option><option>0-3 years</option><option>3-5 years</option><option>5+ years</option></select><CaretDownIcon /></label>
          <label><span>Remote</span><select aria-label="Workplace" value={remote} onChange={(event) => setRemote(event.target.value)}><option>Any workplace</option><option>Hybrid</option><option>Remote</option><option>On-site</option></select><CaretDownIcon /></label>
          <div className={styles.sort}><span>Sort by</span><label><select aria-label="Sort opportunities" value={sort} onChange={(event) => setSort(event.target.value)}><option>Best match</option><option>Newest</option><option>Salary</option></select><CaretDownIcon /></label><button aria-label="Clear filters" title="Clear filters" onClick={clearFilters}><SlidersHorizontalIcon weight="bold" /></button></div>
        </div>
        <div className={styles.tableHead}><span>Company &amp; Role</span><span>Match</span><span>Salary (INR)</span><span>Location</span><span>Posted</span><span>Status</span></div>
        <div className={styles.jobList} aria-busy={isLoading}>
          {isLoading ? <div className={styles.empty}><span>Loading opportunities...</span></div> : null}
          {error ? <div className={styles.empty}><strong>Could not load opportunities</strong><span>{error.message}</span></div> : null}
          {!isLoading && !error ? pageRows.map((item) => (
            <div key={item.id} role="button" tabIndex={0} aria-pressed={selected?.id === item.id} className={`${styles.jobRow} ${selected?.id === item.id ? styles.selected : ""}`} onClick={() => select(item.id)} onKeyDown={(event) => keySelect(event, item.id)}>
              <div className={styles.role}><Logo opportunity={item} /><div><strong>{item.title}</strong><span>{item.company}</span><small>{item.requiredSkills.join(" · ") || "Skills not provided"}</small></div></div>
              <Score value={item.score} />
              <div className={styles.value}><strong>{item.salary}</strong><span>per annum</span></div>
              <div className={styles.value}><strong>{item.city}</strong><span>{item.mode}</span></div>
              <div className={styles.value}><strong>{relativeDate(item.createdAt)}</strong><span>{item.createdAt.toLocaleDateString()}</span></div>
              <div className={styles.status}>
                <button aria-label={`${item.isSaved ? "Remove" : "Save"} ${item.title}`} className={item.isSaved ? styles.saved : ""} disabled={saveMutation.isPending} onClick={(event) => { event.stopPropagation(); toggleSave(item); }}><BookmarkSimpleIcon weight={item.isSaved ? "fill" : "regular"} />{item.isSaved ? "Saved" : "Save"}</button>
                <button aria-label={`Open application for ${item.title}`} disabled={!item.applicationId} onClick={(event) => { event.stopPropagation(); if (item.applicationId) onOpenApplication(item.applicationId); }}><FileTextIcon weight="bold" /></button>
              </div>
            </div>
          )) : null}
          {!isLoading && !error && !visible.length ? <div className={styles.empty}><MagnifyingGlassIcon /><strong>No matching opportunities</strong><span>Try widening a filter or searching for another skill.</span></div> : null}
        </div>
        <div className={styles.listFooter}>
          <span>{visible.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, visible.length)} of ${visible.length} opportunities` : "No opportunities to show"}</span>
          <div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><CaretDownIcon className={styles.previous} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} className={number === currentPage ? styles.current : ""} onClick={() => setPage(number)}>{number}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><CaretDownIcon /></button></div>
        </div>
        <div className={styles.market}><span className={styles.marketIcon}><ChartLineUpIcon weight="bold" /></span><div><p>Your workspace tracks <strong>{opportunities.length} opportunities</strong> and {opportunities.filter((item) => item.stage !== "CAPTURED").length} active applications.</p><small>Open Insights for response rates, pipeline velocity, and operational evidence.</small></div><button onClick={onOpenInsights}>View full insights <ArrowRightIcon /></button></div>
      </section>

      {selected && detailOpen ? (
        <aside className={styles.details} aria-label="Selected opportunity details">
          <button className={styles.close} aria-label="Close details" onClick={() => setDetailOpen(false)}><XIcon /></button>
          <div className={styles.detailHeader}><Logo opportunity={selected} large /><div><h2>{selected.title}</h2><p>{selected.company}<CheckCircleIcon weight="fill" /></p><span><MapPinIcon />{selected.city} · {selected.mode}</span></div><div className={styles.detailScore}><Score value={selected.score} size={68} /><small>Match</small></div></div>
          <section className={styles.fit}><h3>Why this fits</h3><ul>
            <li><CheckCircleIcon weight="fill" /><p><strong>Skill overlap:</strong> {selected.requiredSkills.length - selected.missingSkills.length} of {selected.requiredSkills.length} listed skills currently match your profile.</p></li>
            <li><CheckCircleIcon weight="fill" /><p><strong>Experience:</strong> The role requests {selected.experience}.</p></li>
            <li><CheckCircleIcon weight="fill" /><p><strong>Pipeline status:</strong> This application is currently {selected.stage.replaceAll("_", " ").toLowerCase()}.</p></li>
          </ul></section>
          <section className={styles.facts}><div><span>Salary range</span><strong>{selected.salary} <small>per annum</small></strong></div><div><span>Workplace</span><strong className={styles.signal}><ChartLineUpIcon weight="fill" />{selected.mode}</strong><small>{selected.city}</small></div><div><span>Application deadline</span><strong><CalendarBlankIcon />{selected.deadline ? selected.deadline.toLocaleDateString() : "Not provided"}</strong></div><div><span>Job reference</span><strong>{selected.id.slice(-12).toUpperCase()}</strong></div></section>
          <section className={styles.skills}><span>Required skills ({selected.requiredSkills.length})</span><div>{selected.requiredSkills.map((skill) => <b key={skill}>{skill}</b>)}</div>{selected.missingSkills.length ? <p><span>Skills to strengthen ({selected.missingSkills.length})</span>{selected.missingSkills.map((skill) => <small key={skill}>{skill}</small>)}</p> : null}</section>
          <div className={styles.actions}><button disabled={!selected.applicationId || tailorMutation.isPending} onClick={() => selected.applicationId && tailorMutation.mutate({ workspaceId, applicationId: selected.applicationId })}>{tailorMutation.isPending ? <SparkleIcon weight="fill" /> : <CheckCircleIcon weight="fill" />}{tailorMutation.isPending ? "Starting..." : selected.tailoringStartedAt ? "Continue tailoring" : "Start tailoring"}</button><button disabled={!selected.applicationId || saveMutation.isPending} onClick={() => toggleSave(selected)}><BookmarkSimpleIcon weight={selected.isSaved ? "fill" : "regular"} />{selected.isSaved ? "Saved" : "Save role"}</button></div>
          <section className={styles.brief}><h3><SparkleIcon weight="fill" />Captured job evidence</h3><article><FileTextIcon /><div><h4>Job description</h4><p>{selected.rawInput?.slice(0, 280) || "No job description has been captured yet. Open the application to add or extract details."}</p></div></article><article><UsersThreeIcon /><div><h4>Application workspace</h4><p>Open the application to manage stages, resume versions, tasks, interviews, and outreach in one persistent record.</p>{selected.applicationId ? <button onClick={() => onOpenApplication(selected.applicationId!)}>Open application <ArrowRightIcon /></button> : null}</div></article><article><UserCircleIcon /><div><h4>Networking</h4><p>Connect this application to recruiter and referral outreach from your workspace contacts.</p><button onClick={onOpenNetwork}>Open network <ArrowRightIcon /></button></div></article>{selected.sourceUrl ? <article><ChartLineUpIcon /><div><h4>Original posting</h4><p><a href={selected.sourceUrl} target="_blank" rel="noreferrer">View the captured source</a></p></div></article> : null}</section>
        </aside>
      ) : selected ? <button className={styles.reopen} onClick={() => setDetailOpen(true)}>Open role details <ArrowRightIcon /></button> : null}
      {notice || saveMutation.error || tailorMutation.error ? <div className={styles.toast} role="status"><CheckCircleIcon weight="fill" />{saveMutation.error?.message ?? tailorMutation.error?.message ?? notice}</div> : null}
    </div>
  );
}