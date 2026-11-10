---
id: althea-room
type: experience
title: Software Engineer (Part-time)
org: Althea Room LLC
location: Florida, USA (remote)
period: Oct 2026 – Present
tagline: "Backend & CI"
summary: "Backend, CI and security for a remote US team, from its first automated checks to a production database migration."
order: 1
skills:
  [
    postgresql,
    api-design,
    authentication,
    github-actions,
    ci,
    security,
    android,
    database-migration,
  ]
figure:
  id: fig-ci-pipeline
  idea: "Run the pipeline on a pull request. The security scan blocks the merge until you open each finding, apply the fix and re-run."
  disclaimer: "Made-up repo, findings and code. Not Althea Room's pipeline."
---

# Althea Room: backend, CI and security

## Problem

<!-- TODO(Nhi): one or two sentences on what the team needed when you joined. Keep it to what's okay to share publicly. -->

Althea Room ecosystem has different applications and when I join, the company is developing an application call Mind. This application is in its early stage and do not have proper backend setup so I'm the one responsible for it and work directly with CTO.

## What I did

- Built **8 API endpoints and 6 PostgreSQL tables** for a backend service.
- Integrated the company's **central authentication system**, replacing a development-only login with real session validation.
- Introduced the Android project's **first automated CI checks** in GitHub Actions, covering builds, tests, static analysis and security scanning. Added CI and security workflows to the backend too.
- Fixed **13 security findings across 5 backend repositories** and validated each fix against the existing test suites.
- Coordinated a **production PostgreSQL migration** from DigitalOcean to OVH with the CTO, and verified all **12 tables via checksums**.

## Result

<!-- TODO(Nhi): any outcome you can share, e.g. "CI now blocks merges that fail security scans". -->

## What I learned

<!-- TODO(Nhi): one honest takeaway. -->
