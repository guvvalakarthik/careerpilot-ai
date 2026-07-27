"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, ArrowRight, Check, Briefcase, User, X } from "lucide-react";
import { api } from "@/trpc/react";
import { SKILL_DOMAINS, DOMAIN_NAMES } from "@/lib/skill-domains";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [domain, setDomain] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createWorkspaceMutation = api.workspace.create.useMutation({
    onSuccess: () => {
      setStep(1);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const upsertProfileMutation = api.candidate.upsert.useMutation({
    onSuccess: () => {
      setStep(2);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function toggleSkill(skill: string) {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function handleWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (workspaceName.trim().length < 2) return;
    createWorkspaceMutation.mutate({ name: workspaceName.trim() });
  }

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    upsertProfileMutation.mutate({
      headline: headline || null,
      skills,
      yearsExperience: yearsExp ? parseFloat(yearsExp) : null,
    });
  }

  function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  const steps = [
    { label: "Workspace", icon: Briefcase },
    { label: "Profile", icon: User },
    { label: "Ready", icon: Check },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            CareerPilot<span className="text-slate-400"> AI</span>
          </span>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition ${
                    i <= step
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-8 ${i < step ? "bg-slate-900" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {step === 0 && (
            <>
              <h1 className="text-xl font-bold text-slate-900">Create your workspace</h1>
              <p className="mt-1 text-sm text-slate-500">
                A workspace is your private hub for tracking job applications.
              </p>
              <form onSubmit={handleWorkspace} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Workspace name</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="e.g. My Job Search 2026"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <button
                  type="submit"
                  disabled={createWorkspaceMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {createWorkspaceMutation.isPending ? "Creating..." : "Create workspace"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-slate-900">Set up your profile</h1>
              <p className="mt-1 text-sm text-slate-500">
                Add your skills so AI can score your fit against job postings.
              </p>
              <form onSubmit={handleProfile} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Headline</label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Senior Frontend Engineer"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">Select your domain...</option>
                    {DOMAIN_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Skills</label>
                  {domain ? (
                    <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {SKILL_DOMAINS[domain].map((skill) => {
                          const selected = skills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                selected
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400"
                              }`}
                            >
                              {selected ? "\u2713 " : "+ "}
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 rounded-lg border border-dashed border-slate-300 px-3.5 py-2.5 text-xs text-slate-400">
                      Select a domain above to see suggested skills.
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Or type a custom skill and press Enter"
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
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSkill(s)}
                            className="text-slate-400 transition hover:text-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Years of experience</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={0.5}
                    placeholder="e.g. 5"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <button
                  type="submit"
                  disabled={upsertProfileMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {upsertProfileMutation.isPending ? "Saving..." : "Save profile"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900">You&apos;re all set!</h1>
              <p className="mt-1 text-sm text-slate-500">
                Your workspace is ready. Start capturing job opportunities and track them through your pipeline.
              </p>
              <button
                onClick={finish}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {step > 0 && (
          <button
            onClick={finish}
            className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
