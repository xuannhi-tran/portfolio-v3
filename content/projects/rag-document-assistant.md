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
skills:
  [
    python,
    fastapi,
    react,
    pgvector,
    rag,
    embeddings,
    llm,
    testing,
    github-actions,
    aws,
    nginx,
  ]
links:
  live: https://rag-frontend-lilac.vercel.app/
  repo: https://github.com/xuannhi-tran/rag-document-assistant
figure:
  id: fig-retrieval
  idea: "Ask a question. The top chunks light up and the answer cites them."
  disclaimer: "A simulation: TF-IDF on a made-up handbook, in your browser. The real app uses embeddings, pgvector and Gemini."
---

# RAG Document Assistant

## Problem

<!-- Draft by Claude: Nhi, check it's true and reword in your own voice. -->

I wanted to understand how retrieval grounds an LLM's answers, so I built the whole pipeline myself: PDF ingestion, embeddings in pgvector, and answers grounded in the uploaded text, in English and Vietnamese.

## What I built

- A **multilingual (English/Vietnamese) RAG backend** that uses embeddings and cosine similarity in **pgvector** to ground Gemini's answers in uploaded PDFs.
- **pytest** suite running in **GitHub Actions CI**.
- Deployed on **AWS EC2 behind Nginx**.

## What I learned

<!-- TODO(Nhi) -->
