"use client";

import { useState } from "react";
import { User, Plus, X, Save, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { AppNavbar } from "@/components/app-navbar";

export default function ProfilePage() {
  const { data: profile, isLoading } = api.candidate.get.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNavbar />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return <ProfileForm key={profile?.id ?? "new"} initialProfile={profile ?? null} />;
}

function ProfileForm({
  initialProfile,
}: {
  initialProfile: {
    headline: string | null;
    summary: string | null;
    skills: string[];
    yearsExperience: number | null;
    locations: string[];
    desiredRoles: string[];
    minSalary: number | null;
  } | null;
}) {
  const utils = api.useUtils();

  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [summary, setSummary] = useState(initialProfile?.summary ?? "");
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState(initialProfile?.yearsExperience?.toString() ?? "");
  const [locations, setLocations] = useState<string[]>(initialProfile?.locations ?? []);
  const [locationInput, setLocationInput] = useState("");
  const [desiredRoles, setDesiredRoles] = useState<string[]>(initialProfile?.desiredRoles ?? []);
  const [roleInput, setRoleInput] = useState("");
  const [minSalary, setMinSalary] = useState(initialProfile?.minSalary?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsertMutation = api.candidate.upsert.useMutation({
    onSuccess: () => {
      utils.candidate.get.invalidate();
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setSaved(false);
    },
  });

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 50) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function addLocation() {
    const trimmed = locationInput.trim();
    if (trimmed && !locations.includes(trimmed) && locations.length < 10) {
      setLocations([...locations, trimmed]);
      setLocationInput("");
    }
  }

  function addRole() {
    const trimmed = roleInput.trim();
    if (trimmed && !desiredRoles.includes(trimmed) && desiredRoles.length < 10) {
      setDesiredRoles([...desiredRoles, trimmed]);
      setRoleInput("");
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    upsertMutation.mutate({
      headline: headline || null,
      summary: summary || null,
      skills,
      yearsExperience: yearsExperience ? parseFloat(yearsExperience) : null,
      locations,
      desiredRoles,
      minSalary: minSalary ? parseInt(minSalary) : null,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar />

      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Candidate Profile</h1>
            <p className="text-sm text-slate-500">
              Used for AI fit scoring — keep this updated for accurate results.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          {/* Headline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-semibold text-slate-900">Headline</label>
            <input
              type="text"
              maxLength={120}
              placeholder="e.g. Senior Frontend Engineer specializing in React"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-semibold text-slate-900">Summary</label>
            <textarea
              rows={4}
              maxLength={2000}
              placeholder="Brief overview of your experience, strengths, and what you're looking for..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Skills */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Briefcase className="h-4 w-4 text-slate-400" />
              Skills
            </label>
            <p className="mt-1 text-xs text-slate-400">Add skills you have. These are matched against job requirements for fit scoring.</p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="e.g. React, TypeScript, Python..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((s) => s !== skill))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Years of Experience & Min Salary */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 text-slate-400" />
                Years of Experience
              </label>
              <input
                type="number"
                min={0}
                max={60}
                step={0.5}
                placeholder="e.g. 5"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <DollarSign className="h-4 w-4 text-slate-400" />
                Minimum Salary (USD)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                placeholder="e.g. 120000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Locations */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-slate-400" />
              Preferred Locations
            </label>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="e.g. San Francisco, Remote, New York..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLocation();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={addLocation}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {locations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <span
                    key={loc}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => setLocations(locations.filter((l) => l !== loc))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Desired Roles */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-semibold text-slate-900">Desired Roles</label>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer, Staff Engineer..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={addRole}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {desiredRoles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {desiredRoles.map((role) => (
                  <span
                    key={role}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => setDesiredRoles(desiredRoles.filter((r) => r !== role))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {saved && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600">
              Profile saved successfully! Fit scoring will use these details.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {upsertMutation.isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
