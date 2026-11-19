import type { ComponentType } from "react";
import AgentFig from "./AgentFig";
import AirQualityFig from "./AirQualityFig";
import AltheaFig from "./AltheaFig";
import DubberFig from "./DubberFig";
import MatchFig from "./MatchFig";
import RetrievalFig from "./RetrievalFig";
import RoomFig from "./RoomFig";
import VisaFig from "./VisaFig";

/** Interactive figures, keyed by the figure id in content/projects/*.md. `demo` makes a figure play itself. */
export const FIGURES: Record<string, { head: string; Component: ComponentType<{ demo?: boolean }> }> = {
  "fig-agent-loop": { head: "LANGGRAPH · AGENT LOOP · REPLAY", Component: AgentFig },
  "fig-retrieval": { head: "SIMULATION · TF-IDF IN YOUR BROWSER · 8 CHUNKS", Component: RetrievalFig },
  "fig-visa-check": { head: "VISA CHECK · STUDENT VISA · 48 H / FORTNIGHT", Component: VisaFig },
  "fig-althea": { head: "ALTHEA · CI/CD + DB MIGRATION", Component: AltheaFig },
  "fig-match-score": { head: "MATCH SCORE · 2 ROLES · 6 SKILLS", Component: MatchFig },
  "fig-room-quote": { head: "QUOTE · BATHROOM 3.0 × 2.4 M", Component: RoomFig },
  "fig-dubber": { head: "YOUTUBE DUBBER · ASR → LLM → TTS · 5 STAGES", Component: DubberFig },
  "fig-air-quality": { head: "PM2.5 × ELECTRICITY MIX · CLEANING → MODEL", Component: AirQualityFig },
};
