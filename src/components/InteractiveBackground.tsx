"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";
import { LAND_W, LAND_H, LAND_MASK_B64 } from "./worldLandMask";

/**
 * Decoded equirectangular land bitmask (Natural Earth 50m, 0.5°). Bit
 * `row * LAND_W + col` is set where there is land, giving an accurate
 * coastline to sample dots onto.
 */
const LAND_BYTES = (() => {
  try {
    if (typeof atob !== "undefined") {
      const bin = atob(LAND_MASK_B64);
      const a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      return a;
    }
  } catch {
    /* ignore */
  }
  return new Uint8Array(0);
})();

const isLand = (lon: number, lat: number) => {
  const c = Math.floor(((lon + 180) / 360) * LAND_W);
  const r = Math.floor(((90 - lat) / 180) * LAND_H);
  if (c < 0 || c >= LAND_W || r < 0 || r >= LAND_H) return false;
  const i = r * LAND_W + c;
  return (LAND_BYTES[i >> 3] & (1 << (i & 7))) !== 0;
};

// Mercator latitude → y in projection units
const LAT_TOP = 78;
const LAT_BOTTOM = -56;
const mercY = (latDeg: number) => {
  const l = (Math.max(-82, Math.min(82, latDeg)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + l / 2));
};
const M_TOP = mercY(LAT_TOP);
const M_BOTTOM = mercY(LAT_BOTTOM);

/** Project lon/lat to screen pixels, true Mercator aspect, centered. */
function project(lon: number, lat: number, W: number, H: number) {
  const mapW = W * 0.92;
  const mapH = mapW / 1.82; // mercator aspect for this lat band
  const mapX = (W - mapW) / 2;
  const mapY = (H - mapH) / 2;
  const x = mapX + ((lon + 180) / 360) * mapW;
  const y = mapY + ((M_TOP - mercY(lat)) / (M_TOP - M_BOTTOM)) * mapH;
  return { x, y };
}

/**
 * Rough population-density centers as [lon, lat, weight, sigma(deg)].
 * Used to bias dot placement so populous regions congregate more dots.
 */
const POP_CENTERS: number[][] = [
  [77, 21, 1.0, 9],   // India
  [88, 24, 0.8, 6],   // Bangladesh / E. India
  [114, 31, 1.0, 8],  // Eastern China
  [104, 30, 0.7, 6],  // Central China
  [120, 23, 0.5, 4],  // SE China / Taiwan
  [139, 36, 0.6, 4],  // Japan
  [107, 16, 0.5, 5],  // Vietnam
  [110, -7, 0.7, 5],  // Java / Indonesia
  [121, 14, 0.4, 4],  // Philippines
  [10, 50, 0.7, 7],   // Central Europe
  [-1, 52, 0.4, 4],   // UK
  [13, 43, 0.4, 5],   // Italy
  [31, 28, 0.5, 5],   // Egypt / Nile
  [7, 9, 0.6, 6],     // Nigeria / W. Africa
  [38, 9, 0.4, 4],    // Ethiopia
  [-75, 40, 0.6, 5],  // US Northeast
  [-87, 41, 0.3, 4],  // US Midwest
  [-118, 34, 0.4, 4], // US West
  [-99, 19, 0.5, 4],  // Mexico City
  [-46, -23, 0.5, 5], // Brazil SE
  [-58, -34, 0.3, 3], // Buenos Aires
  [44, 33, 0.4, 5],   // Middle East
  [51, 35, 0.3, 4],   // Iran
  [28, -26, 0.3, 4],  // South Africa
];

const popWeight = (lon: number, lat: number) => {
  let w = 0.08; // baseline so sparse land still gets some coverage
  for (let i = 0; i < POP_CENTERS.length; i++) {
    const [clon, clat, cw, sig] = POP_CENTERS[i];
    const dlon = lon - clon;
    const dlat = lat - clat;
    w += cw * Math.exp(-(dlon * dlon + dlat * dlat) / (2 * sig * sig));
  }
  return w;
};

export default function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live pointer position for the particle interaction (read inside the
  // animation loop). `active` flips off when the pointer leaves so dots
  // ease back to their map home.
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  // Input tracking: drives the ambient cursor glow and the short-range
  // particle "tracking" interaction.
  useEffect(() => {
    setIsClient(true);
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setIsActive(!mobile);

    const onMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      setIsActive(true);
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        setMousePosition({ x: tx, y: ty });
        mouseRef.current = { x: tx, y: ty, active: true };
        setIsActive(true);
      }
    };
    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        scrollRaf = 0;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onPointerLeave);
    window.addEventListener("touchcancel", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onPointerLeave);
      window.removeEventListener("touchcancel", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, []);

  // Particle field: dots fly in and settle onto the world-map land mask.
  useEffect(() => {
    if (!isClient || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const emberPalette = [
      [235, 178, 110],
      [210, 150, 100],
      [224, 150, 75],
      [243, 200, 140],
    ];

    class Particle {
      hx: number;
      hy: number;
      x: number;
      y: number;
      size: number;
      phase: number;
      speed: number;
      color: string;

      constructor(hx: number, hy: number) {
        this.hx = hx;
        this.hy = hy;
        // Fly in from a random spot, or start settled when reduced-motion.
        this.x = reduced ? hx : Math.random() * canvas.width;
        this.y = reduced ? hy : Math.random() * canvas.height;
        this.size = (Math.random() * 1.5 + 0.9) * 0.5;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.3 + Math.random() * 0.5;
        const c = emberPalette[Math.floor(Math.random() * emberPalette.length)];
        this.color = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.5 + Math.random() * 0.4})`;
      }

      update(t: number) {
        if (reduced) {
          this.x = this.hx;
          this.y = this.hy;
          return;
        }
        // Gentle idle bob around the home position.
        const bobX = Math.sin(t * this.speed + this.phase) * 1.6;
        const bobY = Math.cos(t * this.speed * 0.9 + this.phase) * 1.6;
        let tx = this.hx + bobX;
        let ty = this.hy + bobY;

        // Short-range pointer tracking: only dots very close to the cursor
        // are pulled toward it; everything else stays on the map. When the
        // pointer leaves, the target reverts to home and the spring below
        // eases each dot back to its original position.
        const m = mouseRef.current;
        if (m.active) {
          const RADIUS = 280;
          const mdx = m.x - tx;
          const mdy = m.y - ty;
          const md = Math.hypot(mdx, mdy);
          if (md < RADIUS) {
            // Eased falloff so dots drift in smoothly from a wide area and
            // pull harder the closer they get to the cursor.
            const influence = Math.pow((RADIUS - md) / RADIUS, 1.6);
            tx += mdx * influence * 0.425;
            ty += mdy * influence * 0.425;
          }
        }

        // Constant subtle jostle; the home-easing above keeps the random
        // walk from wandering off position.
        const J = 0.55;
        this.x += (tx - this.x) * 0.08 + (Math.random() - 0.5) * J;
        this.y += (ty - this.y) * 0.08 + (Math.random() - 0.5) * J;
      }

      draw() {
        if (!ctx) return;
        // Square micro-dots: far cheaper than arc() at this density.
        ctx.fillStyle = this.color;
        const s = this.size * 1.6;
        ctx.fillRect(this.x, this.y, s, s);
      }
    }

    type Home = { x: number; y: number; weight: number; key: number };

    const buildHomes = (W: number, H: number) => {
      const homes: Home[] = [];
      const step = 0.5; // degrees — finer grid for denser clustering
      for (let lon = -180; lon <= 180; lon += step) {
        for (let lat = LAT_BOTTOM; lat <= LAT_TOP; lat += step) {
          if (isLand(lon, lat)) {
            const p = project(lon, lat, W, H);
            homes.push({ x: p.x, y: p.y, weight: popWeight(lon, lat), key: 0 });
          }
        }
      }
      return homes;
    };

    const init = () => {
      const W = canvas.width;
      const H = canvas.height;
      const homes = buildHomes(W, H);
      // Another 5x the dot count (divisors cut to a fifth again).
      const divisor = window.innerWidth < 768 ? 180 : 90;
      const target = Math.min(Math.floor((W * H) / divisor), homes.length);
      // Weighted sampling without replacement (Efraimidis–Spirakis):
      // key = U^(1/weight); keeping the largest keys makes populous
      // regions congregate proportionally more dots.
      for (let i = 0; i < homes.length; i++) {
        homes[i].key = Math.pow(Math.random(), 1 / homes[i].weight);
      }
      homes.sort((a, b) => b.key - a.key);
      particles = [];
      for (let i = 0; i < target; i++) {
        particles.push(new Particle(homes[i].x, homes[i].y));
      }
    };

    const resize = () => {
      const widthChanged = canvas.width !== window.innerWidth;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (widthChanged || particles.length === 0) init();
    };

    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = performance.now() / 1000;
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(t);
        particles[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isClient]);

  const springConfig = { damping: 25, stiffness: 120 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);

  useEffect(() => {
    if (isClient) {
      cursorX.set(mousePosition.x);
      cursorY.set(mousePosition.y);
    }
  }, [mousePosition, cursorX, cursorY, isClient]);

  if (!isClient) {
    return (
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#1c1611]" />
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#1c1611]">
      {/* Deep warm vignette so the edges fall into shadow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#2a201700_0%,#15100c_85%)]"></div>

      {/* Soft warm aurora wash that drifts and shifts with scroll */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out mix-blend-screen"
        style={{ transform: `translateY(${scrollY * 0.04}px)` }}
      >
        <div className="absolute -top-1/4 left-0 w-[60vw] h-[60vw] bg-[#a9663c]/25 rounded-full blur-[140px] animate-aurora"></div>
        <div className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] bg-[#8a5230]/25 rounded-full blur-[150px] animate-aurora animation-delay-3000"></div>
      </div>

      {/* Base grid pattern that gently parallaxes against the scroll */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#c17a4b12_1px,transparent_1px),linear-gradient(to_bottom,#c17a4b12_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
        style={{ transform: `translateY(${scrollY * 0.08}px)` }}
      ></div>

      {/* World-map particle field */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Large firelight glow that tracks the cursor (ambient light only) */}
      <motion.div
        className="absolute rounded-full mix-blend-screen blur-[100px] pointer-events-none transition-opacity duration-500"
        style={{
          width: isMobile ? 320 : 800,
          height: isMobile ? 320 : 800,
          top: isMobile ? -160 : -400,
          left: isMobile ? -160 : -400,
          background:
            "radial-gradient(circle, rgba(230,168,95,0.45) 0%, rgba(193,122,75,0.22) 50%, rgba(21,16,12,0) 100%)",
          x: cursorX,
          y: cursorY,
          opacity: isActive ? (isMobile ? 0.35 : 0.42) : 0,
        }}
      />
    </div>
  );
}
