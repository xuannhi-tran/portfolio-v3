---
id: althea-room
type: experience
title: Backend Software Engineer (Contributor)
org: Althea Room LLC
location: Remote, 20+ hrs/week
period: Oct 2026 – Present
tagline: "Backend, migration & CI/CD"
summary: "Backend APIs, a production database migration, security reviews and CI/CD across Althea's wellbeing apps: Life, Focus and Mind."
order: 1
stack: [Python, PostgreSQL, GitHub Actions, SonarCloud, Android, React, Next.js]
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
    testing,
    react,
    nextjs,
  ]
figure:
  id: fig-althea
  idea: "Two tabs. CI/CD: run a mobile pull request through build, tests, dependency audit, Sonar and a security scan, fix what blocks it, then release to Google Play track by track. DB migration: copy 12 tables to a new server, verify every checksum, and only then cut over."
  disclaimer: "Made-up repo, tables, findings and numbers. Not Althea Room's real code or data."
---

# Althea Room: backend, migration and CI/CD

## Problem

Althea Room runs a family of wellbeing apps: Life, Focus and Mind. When I joined, Mind was at an early stage and had no proper backend yet. I took responsibility for it and worked directly with the CTO.

## What I did

- Built and extended **REST APIs** for Althea's wellbeing apps, including the **Mind backend (8 endpoints, 6 tables)** with shared authentication integrated from the Core service.
- **Migrated the Focus PostgreSQL database** from a managed cluster to a self-hosted VPS, **verified 12/12 tables**, and prepared the cutover plans for Core and Focus.
- Ran **security reviews across 5 backend repositories**, patching **13 issues**, and fixed auth and password-reset bugs found in beta testing.
- Set up **CI/CD with GitHub Actions**: tests, dependency audit, Sonar, and a **release pipeline to Google Play**, for both backend and mobile repos.
- Also contributed frontend fixes to the company landing site (React/Next.js) and ran beta QA.

## Result

<!-- TODO(Nhi): any outcome you can share, e.g. "CI now blocks merges that fail security scans". -->

## What I learned

<!-- TODO(Nhi): one honest takeaway. -->
