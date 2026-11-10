import type { Figure } from "@/lib/content";
import RetrievalFig from "@/components/figures/RetrievalFig";
import VisaFig from "@/components/figures/VisaFig";
import PipelineFig from "@/components/figures/PipelineFig";
import MatchFig from "@/components/figures/MatchFig";
import RoomFig from "@/components/figures/RoomFig";

/** Interactive figures that exist so far, keyed by the figure id in content/projects/*.md. */
const FIGURES: Record<string, { head: string; Component: React.ComponentType }> = {
  "fig-retrieval": { head: "RETRIEVAL · riverside_library_handbook.pdf · 8 CHUNKS", Component: RetrievalFig },
  "fig-visa-check": { head: "VISA CHECK · STUDENT VISA · 48 H / FORTNIGHT", Component: VisaFig },
  "fig-ci-pipeline": { head: "CI · pr-218 · feat: booking history", Component: PipelineFig },
  "fig-match-score": { head: "MATCH SCORE · 2 ROLES · 6 SKILLS", Component: MatchFig },
  "fig-room-quote": { head: "QUOTE · BATHROOM 3.0 × 2.4 M", Component: RoomFig },
};

/** Frame for a project's figure. Shows the interactive version when it exists, otherwise the plan. */
export default function FigureFrame({ figure, n }: { figure: Figure; n: number }) {
  const live = FIGURES[figure.id];
  return (
    <figure className="fig">
      <div className="fig-inner">
        <div className="fig-head">
          <span>{live ? live.head : figure.id.replace(/^fig-/, "").replace(/-/g, " ").toUpperCase()}</span>
          <span className="fig-status">{live ? "INTERACTIVE" : "IN PROGRESS"}</span>
        </div>
        {live ? <live.Component /> : <div className="fig-placeholder">{figure.idea}</div>}
      </div>
      <figcaption className="fig-cap">
        <b>FIG. {n}</b>&nbsp; {live ? `${figure.idea} ` : ""}
        {figure.disclaimer}
      </figcaption>
    </figure>
  );
}
