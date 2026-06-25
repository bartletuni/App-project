"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";

export default function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(true); // Default to true for desktop on load

  const [scrollY, setScrollY] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    active: true, // Default to true for desktop on load
    pulseX: 0,
    pulseY: 0,
    pulseRadius: 0,
    pulseActive: false,
  });

  const tiltRef = useRef({ x: 0, y: 0 });

  // Unified Mouse & Touch Event Tracking
  useEffect(() => {
    setIsClient(true);
    const mobileCheck = window.innerWidth < 768;
    setIsMobile(mobileCheck);

    if (mobileCheck) {
      // On mobile, deactivate interaction by default until user touches the screen
      mouseRef.current.active = false;
      setIsActive(false);
    } else {
      // On desktop, interaction is active by default
      mouseRef.current.active = true;
      setIsActive(true);
    }

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      setIsActive(true);
    };

    const triggerShockwave = (x: number, y: number) => {
      mouseRef.current.pulseX = x;
      mouseRef.current.pulseY = y;
      mouseRef.current.pulseRadius = 1;
      mouseRef.current.pulseActive = true;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let tiltX = (e.gamma || 0) / 30;
      let tiltY = (e.beta || 0) / 30;

      tiltX = Math.max(-1.5, Math.min(1.5, tiltX));
      tiltY = Math.max(-1.5, Math.min(1.5, tiltY));

      tiltRef.current = { x: tiltX, y: tiltY };
    };

    const requestOrientationPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        } catch (error) {
          console.error("Orientation permission error:", error);
        }
      }
    };

    // Attach immediately for non-iOS 13+ devices
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission !== "function"
    ) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    let permissionRequested = false;
    const handleFirstInteraction = () => {
      if (!permissionRequested) {
        requestOrientationPermission();
        permissionRequested = true;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleFirstInteraction();
      triggerShockwave(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      handleFirstInteraction();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setMousePosition({ x: touch.clientX, y: touch.clientY });
        mouseRef.current.x = touch.clientX;
        mouseRef.current.y = touch.clientY;
        mouseRef.current.active = true;
        setIsActive(true);
        triggerShockwave(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setMousePosition({ x: touch.clientX, y: touch.clientY });
        mouseRef.current.x = touch.clientX;
        mouseRef.current.y = touch.clientY;
        mouseRef.current.active = true;
        setIsActive(true);
      }
    };

    const handleTouchEnd = () => {
      // Deactivate on mobile release to avoid stuck state
      mouseRef.current.active = false;
      setIsActive(false);
    };

    let scrollRaf = 0;
    const handleScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        scrollRaf = 0;
      });
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("scroll", handleScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, []);

  // Particle System
  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      const widthChanged = canvas.width !== window.innerWidth;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (widthChanged || particlesArray.length === 0) {
        init();
      }
    };

    window.addEventListener("resize", resize);

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      baseX: number;
      baseY: number;
      density: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = (Math.random() * 3 + 1) * 0.75;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        // Warm ember tones (amber → terracotta), drifting like firelight motes
        const emberPalette = [
          [230, 168, 95], // amber
          [193, 122, 75], // clay
          [217, 142, 61], // ochre
          [207, 143, 95], // warm tan
        ];
        const [r, g, b] = emberPalette[Math.floor(Math.random() * emberPalette.length)];
        this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.25})`;
        this.density = (Math.random() * 30) + 1;
      }

      update() {
        // Apply gyroscope drift
        this.x += tiltRef.current.x * 0.4;
        this.y += tiltRef.current.y * 0.4;

        // Slow movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Slowly decay speeds back to normal if boosted by dispersion or shockwaves
        const baseMaxSpeed = 0.35;
        let speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
        if (speed > baseMaxSpeed) {
          this.speedX *= 0.95;
          this.speedY *= 0.95;
        }

        // Wrap around logically in CSS coordinates
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Interaction with mouse/touch when active
        let distance = 0;
        if (mouseRef.current.active) {
          let dx = mouseRef.current.x - this.x;
          let dy = mouseRef.current.y - this.y;
          distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 150;

          if (distance < maxDistance && distance > 0) {
              let forceDirectionX = dx / distance;
              let forceDirectionY = dy / distance;
              let force = (maxDistance - distance) / maxDistance;

              let moveSpeed = force * this.density * 0.05;

              if (moveSpeed > distance) {
                  moveSpeed = distance * 0.05;
              }

              let directionX = forceDirectionX * moveSpeed;
              let directionY = forceDirectionY * moveSpeed;

              this.x += directionX;
              this.y += directionY;
          }
        }

        // Shockwave interaction
        if (mouseRef.current.pulseActive) {
          let pdx = this.x - mouseRef.current.pulseX;
          let pdy = this.y - mouseRef.current.pulseY;
          let pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          
          const waveThickness = 30;
          const waveRadius = mouseRef.current.pulseRadius;
          
          if (pDist < waveRadius && pDist > waveRadius - waveThickness) {
            let force = (waveThickness - (waveRadius - pDist)) / waveThickness;
            let pushDirectionX = pdx / pDist;
            let pushDirectionY = pdy / pDist;
            
            const pushForce = force * 6.0;
            this.speedX += pushDirectionX * pushForce;
            this.speedY += pushDirectionY * pushForce;
          }
        }

        // Particle collision/separation
        for (let i = 0; i < particlesArray.length; i++) {
          if (this === particlesArray[i]) continue;
          let p = particlesArray[i];
          let pdx = this.x - p.x;
          let pdy = this.y - p.y;
          
          // AABB distance check FIRST before expensive Math.sqrt operations
          if (Math.abs(pdx) > 40 || Math.abs(pdy) > 40) continue;

          let influence = 0;
          if (mouseRef.current.active) {
            let pdxMouse = mouseRef.current.x - p.x;
            let pdyMouse = mouseRef.current.y - p.y;
            let pDistanceMouse = Math.sqrt(pdxMouse * pdxMouse + pdyMouse * pdyMouse);
            
            let influenceThis = Math.max(0, Math.min(1, (250 - distance) / 150));
            let influenceP = Math.max(0, Math.min(1, (250 - pDistanceMouse) / 150));
            influence = Math.max(influenceThis, influenceP);
          }

          let padding = 20 - (12.5 * influence);
          let minDistance = this.size + p.size + padding;

          if (Math.abs(pdx) < minDistance && Math.abs(pdy) < minDistance) {
            let pDistance = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDistance < minDistance && pDistance > 0) {
              let overlap = minDistance - pDistance;
              
              let separationScale = 0.55 - (0.20 * influence);
              let separationX = (pdx / pDistance) * overlap * separationScale;
              let separationY = (pdy / pDistance) * overlap * separationScale;
              this.x += separationX;
              this.y += separationY;

              let rvx = this.speedX - p.speedX;
              let rvy = this.speedY - p.speedY;
              let nx = pdx / pDistance;
              let ny = pdy / pDistance;
              let velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const restitution = 0.5;
                let impulseScale = 0.60 - (0.45 * influence);
                let impulse = -(1 + restitution) * velAlongNormal * impulseScale;
                let impulseX = impulse * nx * 0.5;
                let impulseY = impulse * ny * 0.5;
                
                this.speedX += impulseX;
                this.speedY += impulseY;
                p.speedX -= impulseX;
                p.speedY -= impulseY;

                let scatterBoost = 0.08 * (1 - influence);
                if (scatterBoost > 0) {
                  this.speedX += nx * scatterBoost;
                  this.speedY += ny * scatterBoost;
                  p.speedX -= nx * scatterBoost;
                  p.speedY -= ny * scatterBoost;
                }

                const maxSpeed = 0.8;
                let speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
                if (speed > maxSpeed) {
                  this.speedX = (this.speedX / speed) * maxSpeed;
                  this.speedY = (this.speedY / speed) * maxSpeed;
                }
                let pSpeed = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
                if (pSpeed > maxSpeed) {
                  p.speedX = (p.speedX / pSpeed) * maxSpeed;
                  p.speedY = (p.speedY / pSpeed) * maxSpeed;
                }
              }
            }
          }
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const init = () => {
      particlesArray = [];
      const mobileCheck = window.innerWidth < 768;
      const divisor = mobileCheck ? 4500 : 2250;
      const numberOfParticles = (canvas.width * canvas.height) / divisor;
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseRef.current.pulseActive) {
        mouseRef.current.pulseRadius += 8;
        if (mouseRef.current.pulseRadius > 250) {
          mouseRef.current.pulseActive = false;
        }
      }

      // Update all particles first
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
      }

      // Constellation: connect nearby particles with lines that
      // brighten as they approach the cursor.
      const linkDistance = 120;
      const mouseActive = mouseRef.current.active;
      for (let i = 0; i < particlesArray.length; i++) {
        const a = particlesArray[i];
        for (let j = i + 1; j < particlesArray.length; j++) {
          const b = particlesArray[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (Math.abs(dx) > linkDistance || Math.abs(dy) > linkDistance) continue;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= linkDistance) continue;

          let alpha = (1 - dist / linkDistance) * 0.16;

          // Boost links near the pointer for a reactive "web" feel
          if (mouseActive) {
            const mx = (a.x + b.x) / 2 - mouseRef.current.x;
            const my = (a.y + b.y) / 2 - mouseRef.current.y;
            const mDist = Math.sqrt(mx * mx + my * my);
            if (mDist < 200) {
              alpha += (1 - mDist / 200) * 0.35;
            }
          }

          ctx.strokeStyle = `rgba(217, 142, 61, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw particles on top of the links
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw();
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
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#1c1611]">
        {/* Fallback background */}
      </div>
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

      {/* Particle / constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Large firelight glow that tracks the cursor */}
      <motion.div
        className="absolute rounded-full mix-blend-screen blur-[100px] pointer-events-none transition-opacity duration-500"
        style={{
          width: isMobile ? 320 : 800,
          height: isMobile ? 320 : 800,
          top: isMobile ? -160 : -400,
          left: isMobile ? -160 : -400,
          background: "radial-gradient(circle, rgba(230,168,95,0.55) 0%, rgba(193,122,75,0.28) 50%, rgba(21,16,12,0) 100%)",
          x: cursorX,
          y: cursorY,
          opacity: isActive ? (isMobile ? 0.4 : 0.5) : 0,
        }}
      />

      {/* Secondary ember orbs with scroll-driven parallax */}
      <div
        className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#c17a4b] rounded-full mix-blend-screen filter blur-3xl opacity-[0.12] animate-blob"
        style={{ transform: `translateY(${scrollY * -0.06}px)` }}
      ></div>
      <div
        className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-[#8a5230] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.14] animate-blob animation-delay-2000"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }}
      ></div>
    </div>
  );
}
