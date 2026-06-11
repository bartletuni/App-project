"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";

export default function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsClient(true);
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener("resize", resize);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
        // 25% smaller on average
        this.size = (Math.random() * 3 + 1) * 0.75;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(139, 92, 246, ${Math.random() * 0.3 + 0.1})`; // Purple-ish
        this.density = (Math.random() * 30) + 1;
      }

      update() {
        // Slow movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Interaction with mouse
        let dx = mouseRef.current.x - this.x;
        let dy = mouseRef.current.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
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

        // Particle collision/separation
        for (let i = 0; i < particlesArray.length; i++) {
          if (this === particlesArray[i]) continue;
          let p = particlesArray[i];
          let pdx = this.x - p.x;
          let pdy = this.y - p.y;
          let minDistance = this.size + p.size + 15; // Increased padding to prevent overlap and maintain separation

          if (Math.abs(pdx) < minDistance && Math.abs(pdy) < minDistance) {
            let pDistance = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pDistance < minDistance && pDistance > 0) {
              let overlap = minDistance - pDistance;
              // Repulsion resolved overlap and keep them separate, reduced by 25%
              let separationX = (pdx / pDistance) * overlap * 0.6375;
              let separationY = (pdy / pDistance) * overlap * 0.6375;
              this.x += separationX;
              this.y += separationY;

              // Apply velocity bounce (elastic collision response) so they move away from each other
              let rvx = this.speedX - p.speedX;
              let rvy = this.speedY - p.speedY;
              let nx = pdx / pDistance;
              let ny = pdy / pDistance;
              let velAlongNormal = rvx * nx + rvy * ny;

              // Only bounce if they are moving towards each other
              if (velAlongNormal < 0) {
                const restitution = 0.8; // Bounciness coefficient
                // Impulse force reduced by 25%
                let impulse = -(1 + restitution) * velAlongNormal * 0.75;
                let impulseX = impulse * nx * 0.5;
                let impulseY = impulse * ny * 0.5;
                
                this.speedX += impulseX;
                this.speedY += impulseY;
                p.speedX -= impulseX;
                p.speedY -= impulseY;

                // Clamp speeds to prevent runaway acceleration
                const maxSpeed = 1.5;
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
      // Doubled number of particles again (halved the area per particle divisor from 4500 to 2250)
      const numberOfParticles = (canvas.width * canvas.height) / 2250;
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
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
        className="absolute top-[-400px] left-[-400px] w-[800px] h-[800px] rounded-full mix-blend-multiply opacity-40 blur-[100px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, rgba(139,92,246,0.3) 50%, rgba(255,255,255,0) 100%)",
          x: cursorX,
          y: cursorY,
        }}
      />

      {/* Secondary accent orb */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
    </div>
  );
}
