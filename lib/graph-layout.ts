import type { Graph } from "@/lib/content";

export const W = 640;
export const H = 420;
export const CX = W / 2;
export const CY = H / 2;

export type Pos = Record<string, [number, number]>;

/** Round to 2 decimals so server and browser produce identical SVG strings (avoids hydration mismatches). */
const r = (n: number) => Math.round(n * 100) / 100;

/** Projects on an inner ring, skills on an outer ring ordered to keep threads from crossing. */
export function layout(graph: Graph): Pos {
  const pos: Pos = {};
  const projects = graph.nodes.filter((n) => n.kind !== "skill");
  const skills = graph.nodes.filter((n) => n.kind === "skill");
  projects.forEach((n, i) => {
    const t = (i / projects.length) * 2 * Math.PI - Math.PI / 2;
    pos[n.id] = [r(CX + Math.cos(t) * 95), r(CY + Math.sin(t) * 80)];
  });
  const angle = (id: string) => Math.atan2(pos[id][1] - CY, pos[id][0] - CX);
  const withAngle = skills.map((s) => {
    const ps = graph.edges.filter((e) => e.target === s.id).map((e) => angle(e.source));
    const a = Math.atan2(
      ps.reduce((acc, t) => acc + Math.sin(t), 0),
      ps.reduce((acc, t) => acc + Math.cos(t), 0),
    );
    return { s, a };
  });
  withAngle.sort((x, y) => x.a - y.a);
  const start = withAngle[0]?.a ?? 0;
  withAngle.forEach(({ s }, i) => {
    const t = (i / withAngle.length) * 2 * Math.PI + start;
    pos[s.id] = [r(CX + Math.cos(t) * 225), r(CY + Math.sin(t) * 180)];
  });
  return pos;
}

export function threadPath([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  // pull the midpoint toward the centre so edges curve like woven thread
  const mx = r(((x1 + x2) / 2) * 0.85 + CX * 0.15);
  const my = r(((y1 + y2) / 2) * 0.85 + CY * 0.15);
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}
