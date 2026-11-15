---
id: ask-nhi-agent
type: project
title: Ask Nhi Agent
subtitle: LangGraph agent with an MCP server, on Azure
period: Nov 2026
tagline: "LangGraph + MCP agent"
summary: "An agentic version of the Ask Nhi chat: a LangGraph agent that decides when to search, searches again when one query isn't enough, and answers with citations."
order: 1
stack: [Python, LangGraph, Claude API, MCP, FastAPI, Docker, GitHub Actions, Azure Container Apps]
skills:
  [
    python,
    langgraph,
    mcp,
    llm,
    rag,
    embeddings,
    pgvector,
    prompt-engineering,
    evaluation,
    fastapi,
    rate-limiting,
    testing,
    docker,
    github-actions,
    azure,
  ]
links:
  live: https://ask-nhi-agent.purpleglacier-190005c1.australiaeast.azurecontainerapps.io/docs
  repo: https://github.com/xuannhi-tran/ask-nhi-agent
figure:
  id: fig-agent-loop
  idea: "Pick a question. Watch the agent loop between the model and its tools until it can answer."
  disclaimer: "A replay. Search queries and scores are illustrative; the answers are trimmed from a real eval run."
---

# Ask Nhi Agent: the chat, rebuilt as an agent

## Problem

<!-- Draft by Claude: Nhi, check it's true and reword in your own voice. -->

The Ask Nhi chat on this site runs one search and then answers. Broad questions like "what security work has Nhi done?" need more than one search, so I rebuilt the backend as an agent that decides for itself when to search, what to search for, and when it has enough to answer.

## What I built

- A **LangGraph agent** on Claude with two tools: `search_portfolio` (Voyage embeddings and **Supabase pgvector**, the same index this site uses) and `match_job_description`, which returns **schema-validated JSON** through Claude structured outputs.
- An **MCP server** that exposes the same two tools, so Claude Desktop or any MCP client can use them.
- A **FastAPI** service with per-IP rate limits, packaged with **Docker**, built and published by **GitHub Actions**, and deployed on **Azure Container Apps**.
- An **eval harness** that grades every answer on cited sources, required facts, refusals, and that it always calls Nhi by name.

## Results

- **12/12** on the site's eval set, including refusals for private details and prompt injection.
- Each failed eval run became a fix: retries for rate-limited embedding calls, and a rule to search 2–3 ways on broad questions after a single search missed Nhi's security work.

## What I learned

<!-- TODO(Nhi) -->
