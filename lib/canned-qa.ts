// Placeholder answers for FIG. 1 until the real RAG endpoint exists (step 3).
export type QA = { q: string; sources: string[]; skills: string[]; answer: { text: string; cite?: string }[] };

export const CANNED_QA: QA[] = [
  {
    q: "Has Nhi used PostgreSQL in production?",
    sources: ["althea-room", "talentmatch"],
    skills: ["postgresql", "database-migration"],
    answer: [
      { text: "Yes. At Althea Room Nhi built 6 PostgreSQL tables and coordinated a production migration from DigitalOcean to OVH, verifying 12 tables by checksum", cite: "althea-room" },
      { text: ". TalentMatch moved from SQLite to PostgreSQL with a least-privilege role", cite: "talentmatch" },
      { text: "." },
    ],
  },
  {
    q: "What has Nhi built with LLMs?",
    sources: ["jobcompass", "rag-document-assistant"],
    skills: ["llm", "rag", "evaluation"],
    answer: [
      { text: "JobCompass combines Gemini extraction with rule-based checks, reaching 75% accuracy with 0% false positives", cite: "jobcompass" },
      { text: ". The RAG Document Assistant grounds answers in PDFs using pgvector", cite: "rag-document-assistant" },
      { text: "." },
    ],
  },
  {
    q: "Has Nhi led a team?",
    sources: ["talentmatch", "renopilot"],
    skills: ["leadership"],
    answer: [
      { text: "Nhi led 5 student engineers on TalentMatch, running meetings, the Git workflow and code reviews", cite: "talentmatch" },
      { text: ", and rotated as Technical Lead on RenoPilot", cite: "renopilot" },
      { text: "." },
    ],
  },
  {
    q: "What security work has Nhi done?",
    sources: ["althea-room", "talentmatch"],
    skills: ["security", "authentication"],
    answer: [
      { text: "Fixed 13 security findings across 5 repos and integrated central auth at Althea Room", cite: "althea-room" },
      { text: ". Added RBAC, upload validation and firewall rules to TalentMatch", cite: "talentmatch" },
      { text: "." },
    ],
  },
];
