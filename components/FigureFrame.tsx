import type { Figure } from "@/lib/content";
import { FIGURES } from "@/components/figures/registry";
import LiveFigure from "@/components/figures/LiveFigure";

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
        {live ? <LiveFigure id={figure.id} /> : <div className="fig-placeholder">{figure.idea}</div>}
      </div>
      <figcaption className="fig-cap">
        <b>FIG. {n}</b>&nbsp; {live ? `${figure.idea} ` : ""}
        {figure.disclaimer}
      </figcaption>
    </figure>
  );
}
