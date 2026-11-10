import type { Graph } from "@/lib/content";

export const W = 760;
export const H = 480;
export const CX = W / 2;
export const CY = H / 2;

export type Pos = Record<string, [number, number]>;

/** Round to 2 decimals so server and browser produce identical SVG strings (avoids hydration mismatches). */
const r = (n: number) => Math.round(n * 100) / 100;

/** "Nhi" in the centre, projects on an inner ring, skills on an outer ring ordered to keep threads from crossing. */
export function layout(graph: Graph): Pos {
  const pos: Pos = {};
  const projects = graph.nodes.filter((n) => n.kind === "project" || n.kind === "experience");
  const skills = graph.nodes.filter((n) => n.kind === "skill");
  for (const n of graph.nodes) if (n.kind === "profile") pos[n.id] = [CX, CY];
  projects.forEach((n, i) => {
    const t = (i / projects.length) * 2 * Math.PI - Math.PI / 2;
    pos[n.id] = [r(CX + Math.cos(t) * 150), r(CY + Math.sin(t) * 112)];
  });
  const angle = (id: string) => Math.atan2(pos[id][1] - CY, pos[id][0] - CX);
  const withAngle = skills.map((s) => {
    // toolkit-only skills hang off the centre; spread them by their place in the list instead
    const ps = graph.edges.filter((e) => e.target === s.id && pos[e.source] && e.source !== "profile").map((e) => angle(e.source));
    const a = ps.length
      ? Math.atan2(
          ps.reduce((acc, t) => acc + Math.sin(t), 0),
          ps.reduce((acc, t) => acc + Math.cos(t), 0),
        )
      : Math.PI / 2 + skills.indexOf(s) * 0.05;
    return { s, a };
  });
  withAngle.sort((x, y) => x.a - y.a);
  const start = withAngle[0]?.a ?? 0;
  withAngle.forEach(({ s }, i) => {
    const t = (i / withAngle.length) * 2 * Math.PI + start;
    // stagger every other skill inward so neighbouring labels don't collide
    const k = i % 2 ? 0.86 : 1;
    pos[s.id] = [r(CX + Math.cos(t) * 320 * k), r(CY + Math.sin(t) * 205 * k)];
  });
  return pos;
}

/** Where a node's label goes: skills point away from the centre, projects sit above or below. */
export function labelFor([x, y]: [number, number], kind: string) {
  if (kind === "profile") return { x, y: y + 4, anchor: "middle" as const };
  if (kind !== "skill") return y > CY + 5 ? { x, y: y + 22, anchor: "middle" as const } : { x, y: y - 13, anchor: "middle" as const };
  const nx = (x - CX) / 300;
  const ny = (y - CY) / 200;
  // on the top and bottom arcs, labels sit above or below the dot so neighbours don't run into each other
  if (Math.abs(ny) > 0.7) return { x, y: ny < 0 ? y - 8 : y + 15, anchor: "middle" as const };
  return { x: x + (nx > 0 ? 7 : -7), y: y + 3, anchor: nx > 0 ? ("start" as const) : ("end" as const) };
}

export type Label = { x: number; y: number; anchor: "start" | "middle" | "end" };

/** Labels for every node, nudged so no two overlap (rough box per label: 6.2px per character, 10px tall). */
export function labelLayout(graph: Graph, pos: Pos): Record<string, Label> {
  const out: Record<string, Label> = {};
  const boxes: [number, number, number, number][] = [];
  const box = (l: Label, text: string, size: number): [number, number, number, number] => {
    const w = text.length * size * 0.62;
    const x0 = l.anchor === "start" ? l.x : l.anchor === "end" ? l.x - w : l.x - w / 2;
    return [x0 - 2, l.y - size, x0 + w + 2, l.y + 2];
  };
  const hits = (b: [number, number, number, number]) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  // projects first, then outer-ring skills, then the staggered inner ones, which have the most room to move
  const order = [...graph.nodes].sort((a, b) => rank(a, pos) - rank(b, pos));
  for (const n of order) {
    const [x, y] = pos[n.id];
    const size = n.kind === "skill" ? 10 : 11;
    const first = labelFor([x, y], n.kind);
    const tries: Label[] =
      n.kind === "skill"
        ? [first, { x: x - (first.x - x), y: first.y, anchor: first.anchor === "start" ? "end" : first.anchor === "end" ? "start" : "middle" }, { x, y: y - 8, anchor: "middle" }, { x, y: y + 15, anchor: "middle" }]
        : [first];
    const pick = tries.find((t) => !hits(box(t, n.label, size))) ?? first;
    out[n.id] = pick;
    boxes.push(box(pick, n.label, size));
  }
  return out;
}

function rank(n: Graph["nodes"][number], pos: Pos) {
  if (n.kind !== "skill") return 0;
  const [x, y] = pos[n.id];
  return 2 - Math.hypot((x - CX) / 320, (y - CY) / 205); // farther out = placed earlier
}

export function threadPath([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  // pull the midpoint toward the centre so edges curve like woven thread
  const mx = r(((x1 + x2) / 2) * 0.85 + CX * 0.15);
  const my = r(((y1 + y2) / 2) * 0.85 + CY * 0.15);
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}
