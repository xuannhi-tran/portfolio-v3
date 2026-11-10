---
id: rag-document-assistant
type: project
title: RAG Document Assistant
subtitle: Multilingual question answering over PDFs
period: Aug 2026 – Oct 2026
tagline: "RAG over PDFs"
summary: "Asking questions of PDFs in English or Vietnamese, with every answer grounded in the source text."
order: 4
stack: [Python, FastAPI, React, pgvector, AWS EC2, Nginx, GitHub Actions]
skills: [python, fastapi, react, pgvector, rag, embeddings, llm, testing, github-actions, aws, nginx]
links:
  live: # TODO(Nhi)
  repo: # TODO(Nhi)
figure:
  id: fig-retrieval
  idea: "Ask a question and every chunk gets a cosine similarity score. The top-k chunks light up and the answer cites them."
  disclaimer: "Made-up handbook. TF-IDF vectors computed in your browser stand in for the real neural embeddings."
---

# RAG Document Assistant

## Problem

<!-- TODO(Nhi): why did you build it? -->

## What I built

- A **multilingual (English/Vietnamese) RAG backend** that uses embeddings and cosine similarity in **pgvector** to ground Gemini's answers in uploaded PDFs.
- **pytest** suite running in **GitHub Actions CI**.
- Deployed on **AWS EC2 behind Nginx**.

## What I learned

<!-- TODO(Nhi) -->
