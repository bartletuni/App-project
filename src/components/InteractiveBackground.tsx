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
        this.size = Math.random() * 3 + 1;
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
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        const maxDistance = 150;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density * 0.6;
        let directionY = forceDirectionY * force * this.density * 0.6;

        if (distance < maxDistance) {
            // Track mouse slowly (attraction)
            this.x += directionX;
            this.y += directionY;
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
      const numberOfParticles = (canvas.width * canvas.height) / 9000;
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
