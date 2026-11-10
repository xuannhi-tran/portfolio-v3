import type { Graph } from "@/lib/content";
import { H, W, layout, threadPath } from "@/lib/graph-layout";

/** Decorative, label-free version of FIG. 1 for the hero. Threads shimmer one after another. */
export default function GraphMini({ graph }: { graph: Graph }) {
  const pos = layout(graph);
  return (
    <a href="#ask" className="fig mini-graph" aria-label="Open FIG. 1: ask Nhi">
      <div className="fig-inner">
        <div className="fig-head">
          <span>FIG. 1 · {graph.nodes.filter((n) => n.kind !== "skill").length} PROJECTS, {graph.edges.length} THREADS</span>
          <span className="fig-status">ASK ↓</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {graph.edges.map((e, i) => (
            <path key={e.source + e.target} d={threadPath(pos[e.source], pos[e.target])} className="thread shimmer" style={{ animationDelay: `${(i * 0.37) % 6}s` }} />
          ))}
          {graph.nodes.map((n) => {
            const [x, y] = pos[n.id];
            return <circle key={n.id} cx={x} cy={y} r={n.kind === "skill" ? 3 : 7} className={n.kind === "skill" ? "dot" : "dot project"} />;
          })}
        </svg>
      </div>
    </a>
  );
}
