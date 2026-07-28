# Dependency security

CareerPilot uses automated weekly dependency update checks for npm packages and GitHub Actions. Patch and minor updates are grouped so they can be reviewed and validated together. Major updates remain separate because they may require migration work.

## Current audit status

As of 2026-07-28, `npm audit` reports 14 findings: 12 high and 2 moderate. No critical findings are reported.

Five findings are in the production dependency graph. They originate from the latest stable Next.js release (`16.2.12`) bundling vulnerable versions of `postcss` and `sharp`; npm propagates those findings to `next`, `next-auth`, and `@sentry/nextjs`. npm currently proposes downgrading Next.js and related packages to incompatible historical releases. We do not accept those unsafe fixes or force transitive overrides. Upgrade Next.js as soon as a compatible stable release includes patched transitive dependencies.

The remaining nine high findings are development-only and originate from ESLint 9 and its plugin graph through `minimatch` and `brace-expansion`. npm's available fix requires ESLint 10, a major upgrade. That migration must be handled separately with compatibility validation for `eslint-config-next`.

## Review commands

Run both views before changing the accepted baseline:

```bash
npm audit --omit=dev
npm audit
```

Never use `npm audit fix --force` without reviewing the proposed major upgrades or downgrades. A finding may only remain accepted when its dependency path, runtime exposure, upstream fix status, and follow-up owner are documented in the pull request.
