---
id: jobcompass
type: project
title: JobCompass
subtitle: Futura Remix Hackathon 2026
period: Sep 2026 – Oct 2026
tagline: "Visa checks with LLMs"
summary: "Checking job ads against student-visa rules, with the ad itself quoted as evidence for every verdict."
order: 2
stack: [Next.js, TypeScript, Gemini API, Redis]
skills:
  [
    nextjs,
    typescript,
    llm,
    prompt-engineering,
    evaluation,
    redis,
    rate-limiting,
  ]
links:
  live: https://jobcompass-au.vercel.app/
  repo: https://github.com/xuannhi-tran/Hackathon-Futura-Remix
figure:
  id: fig-visa-check
  idea: "Pick or edit a job ad. The evidence gets highlighted, rules are applied, and the verdict quotes the ad as proof."
  disclaimer: "Made-up job ads. Simple patterns stand in for the Gemini extraction. Simplified rules, not migration advice."
---

# JobCompass: does this job fit my student visa?

## Problem

International students in Australia have to check every job ad against their student visa conditions, and ads rarely say clearly whether they fit.

<!-- TODO(Nhi): adjust or expand. -->

## What I built

- A tool that checks job ads against Australian student visa requirements. It **combines Gemini extraction with rule-based logic** and **quotes the ad as evidence** for every verdict.
- Deployed to production with analytics, **Redis caching and rate limiting**.

## Results

- **75% overall accuracy** on 20 unseen job ads.
- **0% false-positive rate** for ineligible visa recommendations. It never told a student an ineligible job was fine.
- Served **40 students** and **41 job-ad checks**.

## What I learned

<!-- TODO(Nhi): e.g. why you chose to optimise for zero false positives. -->
