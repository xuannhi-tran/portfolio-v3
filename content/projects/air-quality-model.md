---
id: air-quality-model
type: project
title: Air Quality Model
subtitle: Machine learning team project, ENGG2112
period: Sep 2026 – Oct 2026
tagline: "ML for air pollution"
summary: "Can a country's electricity mix predict its air pollution? I built the data pipeline, the Europe model and an Australia 2030 scenario, and showed the honest answer is mostly no."
order: 6
stack: [Python, pandas, scikit-learn, Ridge regression, Random Forest, Matplotlib]
skills: [python, machine-learning, scikit-learn, evaluation]
figure:
  id: fig-air-quality
  idea: "Toggle the inputs and see what actually predicts PM2.5 in 41 European countries."
  disclaimer: "Real data and models from the project, scored on test years they never saw."
---

# Air Quality Model: does electricity explain air pollution?

## Problem

A university team project asking one question: can we predict a country's air pollution (PM2.5 exposure) from how it generates its electricity?

## What I built

- The **data cleaning pipeline** that merges national electricity data with PM2.5 exposure into one clean table, plus the team's first **baseline Random Forest**.
- The **Europe regional model**: 41 countries, trained on 2000–2018 and tested on 2019–2022, with time-respecting cross-validation and models chosen on validation error only. It reached **R² 0.86** on the test years, about **1.5 µg/m³** off on average, and beat the "same as 2018" baseline (R² 0.79).
- An **ablation** showing the electricity mix adds almost nothing: a control with only year and country scored about the same (**R² 0.87**). The skill comes from knowing the country and the trend.
- An **Australia 2030 scenario** with the team's Oceania model: if fossil fuels fell to 25% of electricity, three models disagreed even on the direction (−1.2 to +0.6 µg/m³), and 25% is outside Australia's historical range, so the effect is small and not reliable.

## Team

A team project. My parts were the data cleaning, the Europe model and the Australia 2030 scenario.

## What I learned

<!-- TODO(Nhi): in your own words. Ideas: why the simple baselines and the ablation mattered, and why a high R² didn't mean the electricity mix was useful. -->
