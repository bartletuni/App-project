"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/* Voxel models — a queue of shop parts, generated procedurally        */
/* ------------------------------------------------------------------ */

const GRID = 15; // xy footprint (cells)
const LAYERS = 12; // z height (cells)

type Cell = { x: number; y: number; z: number; reveal: number };

/** Is the cell at (dx, dy) from center solid at layer z? One per part. */
type Profile = (dx: number, dy: number, z: number) => boolean;

const hexDist = (dx: number, dy: number) =>
  Math.max(Math.abs(dy), Math.abs(dy * 0.5 - dx * 0.866), Math.abs(dy * 0.5 + dx * 0.866));

const PARTS: { name: string; profile: Profile }[] = [
  {
    name: "GEAR-07",
    profile: (dx, dy, z) => {
      const r = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      if (z < 2) return r <= 6.6; // base plate disc
      if (z < 9) {
        // Gear body: 8 teeth around a cored hub
        const tooth = Math.pow(Math.max(0, Math.cos(theta * 8)), 3) * 1.8;
        return r <= 4.3 + tooth && r >= 1.9;
      }
      return r <= 3.1 && r >= 1.9; // top boss ring
    },
  },
  {
    name: "FLANGE-12",
    profile: (dx, dy, z) => {
      const r = Math.hypot(dx, dy);
      if (z < 2) {
        // Base flange with four bolt bores
        if (r > 6.8) return false;
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          if (Math.hypot(dx - Math.cos(a) * 4.9, dy - Math.sin(a) * 4.9) <= 1.2) return false;
        }
        return true;
      }
      return r <= 3.6 && r >= 2.0; // riser tube
    },
  },
  {
    name: "BRACKET-L3",
    profile: (dx, dy, z) => {
      if (z < 3) return Math.abs(dx) <= 6 && Math.abs(dy) <= 5; // foot slab
      // Thin vertical wall along the back edge, with a lightening hole
      if (dy < 3 || dy > 5 || Math.abs(dx) > 6) return false;
      return Math.hypot(dx, z - 7) > 2.2;
    },
  },
  {
    name: "NOZZLE-V2",
    profile: (dx, dy, z) => {
      const r = Math.hypot(dx, dy);
      if (z < 2) return r <= 6.4; // mounting disc
      const outer = 6.2 - (z - 2) * 0.52; // tapering cone
      return r <= outer && r >= Math.max(1.1, outer - 2.4);
    },
  },
  {
    name: "STANDOFF-M8",
    profile: (dx, dy, z) => {
      const h = hexDist(dx, dy);
      if (z < 2) return h <= 6.2; // hex base
      return h <= 4.2 && Math.hypot(dx, dy) >= 1.8; // hex column, bored
    },
  },
];

function buildModel(profile: Profile) {
  const c = (GRID - 1) / 2;
  const layers: Cell[][] = [];
  const solid = new Uint8Array(GRID * GRID * LAYERS);
  const key = (x: number, y: number, z: number) => x + y * GRID + z * GRID * GRID;

  for (let z = 0; z < LAYERS; z++) {
    const cells: Cell[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (profile(x - c, y - c, z)) {
          cells.push({ x, y, z, reveal: 0 });
          solid[key(x, y, z)] = 1;
        }
      }
    }
    // Serpentine (infill) reveal order within the layer
    cells.sort((a, b) => a.y - b.y || (a.y % 2 === 0 ? a.x - b.x : b.x - a.x));
    layers.push(cells);
  }

  // Cull voxels that can never be seen (all six neighbours solid)
  const isSolidAt = (x: number, y: number, z: number) =>
    x >= 0 && x < GRID && y >= 0 && y < GRID && z >= 0 && z < LAYERS
      ? solid[key(x, y, z)] === 1
      : false;

  let reveal = 0;
  const visible: Cell[][] = layers.map((cells) =>
    cells
      .map((cell) => ({ ...cell, reveal: reveal++ }))
      .filter(
        ({ x, y, z }) =>
          !(
            isSolidAt(x + 1, y, z) &&
            isSolidAt(x - 1, y, z) &&
            isSolidAt(x, y + 1, z) &&
            isSolidAt(x, y - 1, z) &&
            isSolidAt(x, y, z + 1) &&
            isSolidAt(x, y, z - 1)
          ),
      ),
  );

  return { layers: visible, totalCells: reveal };
}

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const BUILD_MS = 12000;
const HOLD_MS = 2800;
const FADE_MS = 900;
const CYCLE_MS = BUILD_MS + HOLD_MS + FADE_MS;
const LAYER_HEIGHT_MM = 0.2;

// Warm ember glow for the freshly laid layers (matches the rustic theme)
const EMBER = { r: 230, g: 168, b: 95 };

/**
 * A little shop-floor diorama: an isometric voxel printer working
 * through a queue of five parts — each builds layer by layer under a
 * moving gantry crosshair, holds, dissolves, and the next job starts.
 * Moving the pointer across it slowly rotates the part on the plate.
 * Reduced-motion users see one finished part, statically.
 */
export default function BuildPlate({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const models = PARTS.map((p) => ({ name: p.name, ...buildModel(p.profile) }));
    const center = (GRID - 1) / 2;

    let W = 0;
    let H = 0;
    let raf = 0;
    let rotOffset = 0;
    let rotTarget = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(performance.now());
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      rotTarget = ((e.clientX - rect.left) / rect.width - 0.5) * 1.1;
    };
    const onPointerLeave = () => {
      rotTarget = 0;
    };

    type Face = { pts: { x: number; y: number }[]; fill: string; stroke?: string };

    const draw = (now: number) => {
      // rAF timestamps can precede the captured start time by a frame
      const elapsed = Math.max(0, now - start);
      const model = reduced
        ? models[0]
        : models[Math.floor(elapsed / CYCLE_MS) % models.length];
      const { layers, totalCells } = model;
      const t = reduced ? BUILD_MS + 1 : elapsed % CYCLE_MS;
      const revealCount = reduced
        ? totalCells
        : t < BUILD_MS
          ? Math.floor((t / BUILD_MS) * totalCells)
          : totalCells;
      const globalAlpha =
        !reduced && t > BUILD_MS + HOLD_MS
          ? Math.max(0, 1 - (t - BUILD_MS - HOLD_MS) / FADE_MS)
          : 1;

      const angle = reduced
        ? -0.45
        : (elapsed / 1000) * 0.1 + rotOffset - 0.45;
      rotOffset += (rotTarget - rotOffset) * 0.05;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Screen basis vectors for the isometric projection
      const s = Math.min(W, H) / (GRID * 2.05);
      const exx = 0.866 * s;
      const exy = 0.5 * s;
      const ezz = 0.92 * s;
      const ox = W / 2;
      const oy = H * 0.62;

      const rot = (mx: number, my: number) => ({
        wx: (mx - center - 0.5) * cosA - (my - center - 0.5) * sinA,
        wy: (mx - center - 0.5) * sinA + (my - center - 0.5) * cosA,
      });
      const proj = (mx: number, my: number, mz: number) => {
        const { wx, wy } = rot(mx, my);
        return { x: ox + (wx - wy) * exx, y: oy + (wx + wy) * exy - mz * ezz };
      };

      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = globalAlpha;

      // --- Build plate outline (a rotated square with warm hairline) ---
      const half = GRID / 2 + 1.5;
      const plate = [
        proj(center + 0.5 - half, center + 0.5 - half, 0),
        proj(center + 0.5 + half, center + 0.5 - half, 0),
        proj(center + 0.5 + half, center + 0.5 + half, 0),
        proj(center + 0.5 - half, center + 0.5 + half, 0),
      ];
      ctx.strokeStyle = "rgba(224, 190, 154, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      plate.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();

      // --- Collect visible voxels, painter-sorted back to front ---
      const drawList: { cell: Cell; depth: number }[] = [];
      let head: Cell | null = null;
      let currentLayer = 0;
      for (let z = 0; z < layers.length; z++) {
        for (const cell of layers[z]) {
          if (cell.reveal >= revealCount) continue;
          const { wx, wy } = rot(cell.x + 0.5, cell.y + 0.5);
          drawList.push({ cell, depth: wx + wy });
          if (!head || cell.reveal > head.reveal) head = cell;
        }
      }
      if (head) currentLayer = head.z;
      drawList.sort((a, b) => a.depth - b.depth || a.cell.z - b.cell.z);

      // --- Draw cubes ---
      for (const { cell } of drawList) {
        const { x, y, z } = cell;
        // Eight projected corners
        const c000 = proj(x, y, z);
        const c100 = proj(x + 1, y, z);
        const c010 = proj(x, y + 1, z);
        const c110 = proj(x + 1, y + 1, z);
        const c001 = proj(x, y, z + 1);
        const c101 = proj(x + 1, y, z + 1);
        const c011 = proj(x, y + 1, z + 1);
        const c111 = proj(x + 1, y + 1, z + 1);

        // Ember tint for the layers being printed right now
        let tint = 0;
        if (!reduced && revealCount < totalCells) {
          if (z === currentLayer) tint = 0.55;
          else if (z === currentLayer - 1) tint = 0.16;
        }

        const faces: Face[] = [];

        // Side faces: normals rotate with the part; the two whose
        // outward normal points toward the camera (nx + ny < 0) show.
        const sides: {
          nx: number;
          ny: number;
          pts: { x: number; y: number }[];
        }[] = [
          { nx: cosA, ny: sinA, pts: [c100, c110, c111, c101] }, // +x
          { nx: -cosA, ny: -sinA, pts: [c000, c010, c011, c001] }, // -x
          { nx: -sinA, ny: cosA, pts: [c010, c110, c111, c011] }, // +y
          { nx: sinA, ny: -cosA, pts: [c000, c100, c101, c001] }, // -y
        ];
        for (const f of sides) {
          if (f.nx + f.ny < 0) {
            // Lambert-ish shade from a fixed key light, warm-biased
            const lum = 34 + Math.max(0, -(f.nx * 0.9 + f.ny * 0.1)) * 20;
            const g = Math.round(lum);
            faces.push({
              pts: f.pts,
              fill: `rgb(${g + 14}, ${g + 5}, ${g - 4})`,
            });
          }
        }

        // Top face — always visible from this camera
        const topEmber = `rgba(${EMBER.r}, ${EMBER.g}, ${EMBER.b}, ${tint})`;
        faces.push({
          pts: [c001, c101, c111, c011],
          fill: "#55422f",
          stroke: tint > 0 ? topEmber : "rgba(244, 236, 223, 0.1)",
        });

        for (const f of faces) {
          ctx.beginPath();
          f.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          ctx.fillStyle = f.fill;
          ctx.fill();
          // Stroke with the fill colour to seal seams between voxels
          ctx.strokeStyle = f.fill;
          ctx.lineWidth = 0.75;
          ctx.stroke();
          if (f.stroke) {
            ctx.strokeStyle = f.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        if (tint > 0.2) {
          // Fresh extrusion glow on the active layer's top
          ctx.fillStyle = `rgba(${EMBER.r}, ${EMBER.g}, ${EMBER.b}, ${tint * 0.22})`;
          ctx.beginPath();
          [c001, c101, c111, c011].forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.closePath();
          ctx.fill();
        }
      }

      // --- Gantry + nozzle over the freshest voxel ---
      if (!reduced && head && revealCount < totalCells) {
        const hp = proj(head.x + 0.5, head.y + 0.5, head.z + 1);
        ctx.strokeStyle = `rgba(${EMBER.r}, ${EMBER.g}, ${EMBER.b}, 0.35)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hp.x, 8);
        ctx.lineTo(hp.x, hp.y - 4);
        ctx.moveTo(hp.x - 26, hp.y);
        ctx.lineTo(hp.x - 6, hp.y);
        ctx.moveTo(hp.x + 6, hp.y);
        ctx.lineTo(hp.x + 26, hp.y);
        ctx.stroke();
        ctx.fillStyle = `rgba(${EMBER.r}, ${EMBER.g}, ${EMBER.b}, 0.9)`;
        ctx.fillRect(hp.x - 1.5, hp.y - 1.5, 3, 3);
      }

      ctx.globalAlpha = 1;

      // --- HUD readouts (DOM refs; no React re-render) ---
      if (layerRef.current && zRef.current) {
        const shownLayer = revealCount >= totalCells ? LAYERS : currentLayer + 1;
        layerRef.current.textContent = `${String(shownLayer).padStart(2, "0")}/${LAYERS}`;
        zRef.current.textContent = (shownLayer * LAYER_HEIGHT_MM).toFixed(2);
      }
      if (nameRef.current && nameRef.current.textContent !== model.name) {
        nameRef.current.textContent = model.name;
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-square w-full select-none ${className}`}
      role="img"
      aria-label="Animated preview of a queue of parts being 3D printed layer by layer on a build plate"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div aria-hidden="true" className="pointer-events-none absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cream-500">
        Job queue <span ref={nameRef} className="text-clay-300">GEAR-07</span>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-3 top-3 text-right font-mono text-[9px] uppercase tracking-[0.22em] text-cream-500">
        <div>
          Layer <span ref={layerRef} className="text-cream-200">00/12</span>
        </div>
        <div className="mt-1">
          Z <span ref={zRef} className="text-cream-200">0.00</span> mm
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cream-600">
        PPA-CF · 0.2 mm
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cream-600">
        hover to rotate
      </div>
    </div>
  );
}
