"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";

export default function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    active: false,
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

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
      setIsActive(true);
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      setIsActive(false);
    };

    const triggerShockwave = (x: number, y: number) => {
      mouseRef.current.pulseX = x;
      mouseRef.current.pulseY = y;
      mouseRef.current.pulseRadius = 1;
      mouseRef.current.pulseActive = true;
    };

    const handleMouseDown = (e: MouseEvent) => {
      triggerShockwave(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
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
      mouseRef.current.active = false;
      setIsActive(false);
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // Gyroscope / Device Orientation event listener
  useEffect(() => {
    if (!isClient) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let tiltX = (e.gamma || 0) / 30; // normalized range, more sensitive response
      let tiltY = (e.beta || 0) / 30;

      // Clamp range to prevent runaway acceleration drift
      tiltX = Math.max(-1.5, Math.min(1.5, tiltX));
      tiltY = Math.max(-1.5, Math.min(1.5, tiltY));

      tiltRef.current = { x: tiltX, y: tiltY };
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isClient]);

  // Particle System
  useEffect(() => {
    if (!isClient || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      
      init();
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
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.baseX = this.x;
        this.baseY = this.y;
        // 25% smaller on average
        this.size = (Math.random() * 3 + 1) * 0.75;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(139, 92, 246, ${Math.random() * 0.3 + 0.1})`; // Purple-ish
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
        if (this.x < 0) this.x = window.innerWidth;
        if (this.x > window.innerWidth) this.x = 0;
        if (this.y < 0) this.y = window.innerHeight;
        if (this.y > window.innerHeight) this.y = 0;

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

              // Reduced attraction for smoother organizing, scaled by distance to prevent jitter
              let moveSpeed = force * this.density * 0.05;

              // Prevent overshooting and spazzing when exactly at the mouse
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
            
            // Push outwards dynamically
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
          
          // Check if either particle is near the mouse
          let influence = 0;
          if (mouseRef.current.active) {
            let pdxMouse = mouseRef.current.x - p.x;
            let pdyMouse = mouseRef.current.y - p.y;
            let pDistanceMouse = Math.sqrt(pdxMouse * pdxMouse + pdyMouse * pdyMouse);
            
            let influenceThis = Math.max(0, Math.min(1, (250 - distance) / 150));
            let influenceP = Math.max(0, Math.min(1, (250 - pDistanceMouse) / 150));
            influence = Math.max(influenceThis, influenceP);
          }

          // Smoothly transition spacing: 7.5px padding when near, 20px padding when far
          let padding = 20 - (12.5 * influence);
          let minDistance = this.size + p.size + padding;

          if (Math.abs(pdx) < minDistance && Math.abs(pdy) < minDistance) {
            let pDistance = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDistance < minDistance && pDistance > 0) {
              let overlap = minDistance - pDistance;
              
              // Smoothly transition separation force: gentle near mouse (0.35), moderate when dispersing (0.55)
              let separationScale = 0.55 - (0.20 * influence);
              let separationX = (pdx / pDistance) * overlap * separationScale;
              let separationY = (pdy / pDistance) * overlap * separationScale;
              this.x += separationX;
              this.y += separationY;

              // Apply velocity bounce (elastic collision response)
              let rvx = this.speedX - p.speedX;
              let rvy = this.speedY - p.speedY;
              let nx = pdx / pDistance;
              let ny = pdy / pDistance;
              let velAlongNormal = rvx * nx + rvy * ny;

              // Only bounce if they are moving towards each other
              if (velAlongNormal < 0) {
                const restitution = 0.5; // Soft bounciness
                // Smoothly transition bounce force: gentle near mouse (0.15), moderate when dispersing (0.6)
                let impulseScale = 0.60 - (0.45 * influence);
                let impulse = -(1 + restitution) * velAlongNormal * impulseScale;
                let impulseX = impulse * nx * 0.5;
                let impulseY = impulse * ny * 0.5;
                
                this.speedX += impulseX;
                this.speedY += impulseY;
                p.speedX -= impulseX;
                p.speedY -= impulseY;

                // Smoothly transition outward velocity boost based on mouse distance
                let scatterBoost = 0.08 * (1 - influence);
                if (scatterBoost > 0) {
                  this.speedX += nx * scatterBoost;
                  this.speedY += ny * scatterBoost;
                  p.speedX -= nx * scatterBoost;
                  p.speedY -= ny * scatterBoost;
                }

                // Clamp speeds to prevent runaway acceleration, moderate for smooth dispersion
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
      const numberOfParticles = (window.innerWidth * window.innerHeight) / divisor;
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Expand shockwave pulse
      if (mouseRef.current.pulseActive) {
        mouseRef.current.pulseRadius += 8;
        if (mouseRef.current.pulseRadius > 250) {
          mouseRef.current.pulseActive = false;
        }
      }

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize dimensions and start animate
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
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#f9fafb]">
        {/* Fallback background */}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#f9fafb]">
      {/* Base gradient pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Large subtle glowing orb that tracks mouse */}
      <motion.div
        className="absolute rounded-full mix-blend-multiply blur-[100px] pointer-events-none transition-opacity duration-500"
        style={{
          width: isMobile ? 320 : 800,
          height: isMobile ? 320 : 800,
          top: isMobile ? -160 : -400,
          left: isMobile ? -160 : -400,
          background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(139,92,246,0.3) 50%, rgba(255,255,255,0) 100%)",
          x: cursorX,
          y: cursorY,
          opacity: isActive ? (isMobile ? 0.35 : 0.40) : 0,
        }}
      />

      {/* Secondary accent orb */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
    </div>
  );
}
