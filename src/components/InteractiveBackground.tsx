"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";

/**
 * Coarse continental outlines as [lon, lat] polygons. Rough by design —
 * enough to read as a world map once projected and dotted. Ray-casting
 * point-in-polygon decides which lon/lat samples are "land".
 */
const CONTINENTS: number[][][] = [
  // North America
  [[-165, 66], [-140, 71], [-105, 72], [-83, 70], [-62, 60], [-55, 49], [-67, 45], [-76, 38], [-81, 30], [-90, 29], [-97, 22], [-106, 23], [-115, 32], [-125, 42], [-135, 55], [-152, 60]],
  // Greenland
  [[-46, 60], [-30, 60], [-18, 66], [-22, 76], [-38, 82], [-55, 79], [-52, 68]],
  // South America
  [[-79, 9], [-69, 11], [-60, 5], [-51, 0], [-35, -6], [-39, -16], [-49, -25], [-58, -34], [-66, -43], [-73, -52], [-74, -44], [-71, -33], [-71, -20], [-77, -12], [-81, -3]],
  // Africa
  [[-16, 21], [-9, 30], [0, 35], [11, 34], [24, 32], [35, 31], [44, 11], [51, 12], [48, 2], [41, -12], [38, -20], [27, -33], [19, -35], [13, -23], [9, -1], [3, 5], [-8, 4], [-16, 10]],
  // Europe (+ western Russia)
  [[-9, 37], [-9, 44], [-3, 49], [2, 51], [-5, 58], [8, 63], [18, 69], [28, 71], [30, 62], [40, 60], [55, 58], [60, 50], [48, 46], [40, 44], [28, 41], [20, 38], [12, 37], [2, 36]],
  // Asia
  [[40, 45], [45, 60], [55, 68], [70, 73], [100, 77], [130, 73], [160, 68], [180, 66], [178, 60], [160, 58], [145, 48], [140, 38], [122, 40], [120, 30], [122, 22], [110, 18], [105, 8], [97, 6], [88, 21], [80, 8], [76, 18], [70, 24], [62, 25], [56, 30], [48, 38]],
  // Australia
  [[114, -22], [122, -18], [132, -12], [142, -11], [147, -20], [150, -28], [146, -38], [138, -36], [129, -32], [120, -34], [114, -29]],
  // Indonesia / SE-Asia archipelago
  [[95, 5], [120, 5], [140, -5], [120, -10], [100, -2]],
  // Japan
  [[130, 31], [136, 34], [142, 40], [140, 44], [133, 36]],
  // British Isles
  [[-6, 50], [-2, 52], [-3, 58], [-7, 57]],
];

function pointInPolygon(lon: number, lat: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const isLand = (lon: number, lat: number) =>
  CONTINENTS.some((p) => pointInPolygon(lon, lat, p));

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
        this.size = Math.random() * 1.5 + 0.9;
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
          const RADIUS = 110;
          const mdx = m.x - tx;
          const mdy = m.y - ty;
          const md = Math.hypot(mdx, mdy);
          if (md < RADIUS) {
            const influence = (RADIUS - md) / RADIUS; // 0..1, strongest up close
            tx += mdx * influence * 0.65;
            ty += mdy * influence * 0.65;
          }
        }

        this.x += (tx - this.x) * 0.08;
        this.y += (ty - this.y) * 0.08;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const buildHomes = (W: number, H: number) => {
      const homes: { x: number; y: number }[] = [];
      const step = 1; // degrees
      for (let lon = -180; lon <= 180; lon += step) {
        for (let lat = LAT_BOTTOM; lat <= LAT_TOP; lat += step) {
          if (isLand(lon, lat)) homes.push(project(lon, lat, W, H));
        }
      }
      // Shuffle so subsampling is even across the map.
      for (let i = homes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [homes[i], homes[j]] = [homes[j], homes[i]];
      }
      return homes;
    };

    const init = () => {
      const W = canvas.width;
      const H = canvas.height;
      const homes = buildHomes(W, H);
      // Density (divisors halved here doubles the dot count).
      const divisor = window.innerWidth < 768 ? 4500 : 2250;
      const target = Math.min(Math.floor((W * H) / divisor), homes.length);
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
