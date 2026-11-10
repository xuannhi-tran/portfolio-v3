"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";

/*
 * FIG: renovation quote, in the spirit of RenoPilot.
 * A small Three.js bathroom. Swap the tiles, vanity or shower and the 3D preview and the
 * cost breakdown update together. Made-up prices; not the client's interface or code.
 */

const FLOOR_M2 = 7.2; // 3.0 m x 2.4 m

const OPTIONS = {
  tiles: [
    { name: "Porcelain", price: 45, unit: "m²", color: 0xd9d2c3 },
    { name: "Terrazzo", price: 90, unit: "m²", color: 0xbfb3a0 },
    { name: "Marble", price: 160, unit: "m²", color: 0xf1ede6 },
  ],
  vanity: [
    { name: "Single 600", price: 650, width: 0.6 },
    { name: "Single 900", price: 980, width: 0.9 },
    { name: "Double 1500", price: 1850, width: 1.5 },
  ],
  shower: [
    { name: "Screen shower", price: 1400, kind: "screen" as const },
    { name: "Bathtub", price: 1900, kind: "tub" as const },
    { name: "Walk-in + niche", price: 2600, kind: "walkin" as const },
  ],
};

type Choice = { tiles: number; vanity: number; shower: number };
const LABOUR_RATE = 0.35;
const DEMOLITION = 1800;
const aud = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function quote(c: Choice) {
  const tiles = OPTIONS.tiles[c.tiles].price * FLOOR_M2;
  const vanity = OPTIONS.vanity[c.vanity].price;
  const shower = OPTIONS.shower[c.shower].price;
  const materials = tiles + vanity + shower;
  const labour = materials * LABOUR_RATE + DEMOLITION;
  const subtotal = materials + labour;
  const gst = subtotal * 0.1;
  return {
    lines: [
      { label: `${OPTIONS.tiles[c.tiles].name} tiles · ${FLOOR_M2} m²`, value: tiles },
      { label: `Vanity · ${OPTIONS.vanity[c.vanity].name}`, value: vanity },
      { label: OPTIONS.shower[c.shower].name, value: shower },
      { label: `Labour (${LABOUR_RATE * 100}%) + demolition`, value: labour },
      { label: "GST 10%", value: gst },
    ],
    total: subtotal + gst,
  };
}

type Api = { apply: (c: Choice) => void; dispose: () => void };

export default function RoomFig() {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [choice, setChoice] = useState<Choice>({ tiles: 1, vanity: 1, shower: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const q = quote(choice);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const probe = document.createElement("canvas");
      if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) {
        setFailed("3D preview needs WebGL, which this browser has turned off.");
        return;
      }
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        if (cancelled || !mount.current) return;
        api.current = buildScene(THREE, OrbitControls, mount.current);
        setReady(true);
      } catch (err) {
        console.error("RoomFig failed to start", err);
        setFailed(`3D preview failed to load: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
    return () => {
      cancelled = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) api.current?.apply(choice);
  }, [ready, choice]);

  return (
    <div className="room">
      <div className="room-view">
        <div ref={mount} className="room-canvas" aria-label="3D preview of the bathroom. Drag to orbit." role="img" />
        {!ready && <p className="room-msg">{failed ?? "Loading 3D preview…"}</p>}
        <span className="room-hint eyebrow">Drag to orbit</span>
      </div>

      <div className="room-side">
        {(Object.keys(OPTIONS) as (keyof Choice)[]).map((slot) => (
          <fieldset key={slot}>
            <legend className="eyebrow">{slot}</legend>
            <div className="rf-presets">
              {OPTIONS[slot].map((o, i) => (
                <button type="button" key={o.name} aria-pressed={choice[slot] === i} onClick={() => setChoice({ ...choice, [slot]: i })}>
                  {o.name}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <table className="room-quote">
          <tbody>
            {q.lines.map((l) => (
              <tr key={l.label}>
                <td>{l.label}</td>
                <td>{aud(l.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total estimate</td>
              <td aria-live="polite">{aud(q.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------- Three.js scene ---------- */

function buildScene(
  THREE: typeof THREE_NS,
  OrbitControls: typeof import("three/addons/controls/OrbitControls.js").OrbitControls,
  el: HTMLDivElement,
): Api {
  const W = 3, D = 2.4, H = 2.4;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(4.2, 3.4, 4.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(W / 2 - 0.2, 0.7, D / 2 - 0.2);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.enableZoom = false; // keep the page scroll working over the canvas
  controls.minAzimuthAngle = -0.1;
  controls.maxAzimuthAngle = Math.PI / 2 + 0.1;

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a12, 1.4));
  const sun = new THREE.DirectionalLight(0xffe6b0, 2.2);
  sun.position.set(4, 6, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const glow = new THREE.PointLight(0xe0b04a, 6, 4);
  glow.position.set(0.6, 2.0, 0.4);
  scene.add(glow);

  const mat = (color: number, extra: Partial<THREE_NS.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

  const box = (w: number, h: number, d: number, m: THREE_NS.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };

  // shell: floor, two walls, gold trim
  const floorMat = mat(0xbfb3a0, { roughness: 0.35 });
  const floor = box(W, 0.05, D, floorMat);
  floor.position.set(W / 2, -0.025, D / 2);
  scene.add(floor);
  const grid = new THREE.GridHelper(3, 10, 0x000000, 0x000000);
  (grid.material as THREE_NS.Material).opacity = 0.12;
  (grid.material as THREE_NS.Material).transparent = true;
  grid.scale.set(1, 1, D / W);
  grid.position.set(W / 2, 0.002, D / 2);
  scene.add(grid);
  const wallMat = mat(0x2a2116);
  const back = box(W, H, 0.06, wallMat);
  back.position.set(W / 2, H / 2, -0.03);
  const side = box(0.06, H, D, wallMat);
  side.position.set(-0.03, H / 2, D / 2);
  scene.add(back, side);
  const gold = mat(0xe0b04a, { metalness: 0.8, roughness: 0.3 });
  const trimA = box(W, 0.02, 0.07, gold);
  trimA.position.set(W / 2, 1.2, 0.01);
  const trimB = box(0.07, 0.02, D, gold);
  trimB.position.set(0.01, 1.2, D / 2);
  scene.add(trimA, trimB);

  // toilet (fixed)
  const white = mat(0xf4efe6, { roughness: 0.25 });
  const toilet = new THREE.Group();
  const bowl = box(0.38, 0.4, 0.55, white);
  bowl.position.set(0, 0.2, 0.3);
  const cistern = box(0.4, 0.4, 0.16, white);
  cistern.position.set(0, 0.6, 0.08);
  toilet.add(bowl, cistern);
  toilet.position.set(0.4, 0, 0.02);
  scene.add(toilet);

  // swappable groups
  const vanityG = new THREE.Group();
  const showerG = new THREE.Group();
  scene.add(vanityG, showerG);

  const timber = mat(0x6b4a2b, { roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.25, roughness: 0.05, transmission: 0.6 });
  const chrome = mat(0xd0d0d0, { metalness: 1, roughness: 0.2 });

  function clear(g: THREE_NS.Group) {
    g.children.slice().forEach((c) => {
      g.remove(c);
      (c as THREE_NS.Mesh).geometry?.dispose();
    });
  }

  function apply(c: Choice) {
    floorMat.color.setHex(OPTIONS.tiles[c.tiles].color);
    floorMat.roughness = c.tiles === 2 ? 0.15 : 0.4;

    clear(vanityG);
    const vw = OPTIONS.vanity[c.vanity].width;
    const cab = box(vw, 0.55, 0.46, timber);
    cab.position.set(0, 0.5, 0.23);
    const top = box(vw + 0.02, 0.04, 0.48, white);
    top.position.set(0, 0.795, 0.24);
    vanityG.add(cab, top);
    const sinks = c.vanity === 2 ? [-vw / 4, vw / 4] : [0];
    sinks.forEach((x) => {
      const basin = box(0.36, 0.1, 0.3, white);
      basin.position.set(x, 0.86, 0.25);
      const mirror = box(Math.min(0.55, vw / sinks.length - 0.1), 0.7, 0.02, mat(0x8fa2ff, { metalness: 0.9, roughness: 0.05 }));
      mirror.position.set(x, 1.65, 0.02);
      const tap = box(0.03, 0.12, 0.03, chrome);
      tap.position.set(x, 0.93, 0.08);
      vanityG.add(basin, mirror, tap);
    });
    vanityG.position.set(1.0 + vw / 2, 0, 0.0);

    clear(showerG);
    const kind = OPTIONS.shower[c.shower].kind;
    if (kind === "tub") {
      const tub = box(1.6, 0.55, 0.75, white);
      tub.position.set(0, 0.275, 0);
      const inner = box(1.45, 0.05, 0.6, mat(0xdfe8f5, { roughness: 0.1 }));
      inner.position.set(0, 0.53, 0);
      showerG.add(tub, inner);
      showerG.position.set(0.8 + 0.03, 0, D - 0.4);
      showerG.rotation.y = 0;
    } else {
      const size = kind === "walkin" ? 1.2 : 0.9;
      const base = box(size, 0.04, size, mat(0xe6e0d5, { roughness: 0.3 }));
      base.position.set(0, 0.02, 0);
      const panel = box(0.02, 2.0, size, glass);
      panel.position.set(size / 2, 1.02, 0);
      const head = box(0.25, 0.02, 0.25, chrome);
      head.position.set(-size / 2 + 0.2, 2.05, 0);
      showerG.add(base, panel, head);
      if (kind === "screen") {
        const door = box(size, 2.0, 0.02, glass);
        door.position.set(0, 1.02, -size / 2);
        showerG.add(door);
      } else {
        const niche = box(0.02, 0.3, 0.5, gold);
        niche.position.set(-size / 2 + 0.01, 1.3, 0);
        showerG.add(niche);
      }
      showerG.position.set(size / 2 + 0.01, 0, D - size / 2 - 0.01);
    }
  }

  const resize = () => {
    const { width, height } = el.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  // only render while visible
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(el);
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  };
  loop();

  return {
    apply,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    },
  };
}
