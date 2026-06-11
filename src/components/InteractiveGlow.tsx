"use client";

import React, { useRef, useState } from "react";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. rgba(6, 182, 212, 0.15) for cyan
}

export function GlowCard({
  children,
  className = "",
  glowColor = "rgba(99, 102, 241, 0.12)", // Default indigo-500/12
  ...props
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden transition-all duration-300 border border-slate-800 bg-slate-900/40 backdrop-blur-md rounded-2xl ${className}`}
      style={{
        // Set CSS variables dynamically
        // @ts-ignore
        "--mouse-x": `${coords.x}px`,
        "--mouse-y": `${coords.y}px`,
      }}
      {...props}
    >
      {/* Spotlight background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), ${glowColor}, transparent 80%)`,
        }}
      />
      {/* Spotlight border glow highlight */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl border border-transparent z-10 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.1), transparent 45%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 6, // maximum tilt angle in degrees
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { maxTilt?: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalize coordinates (-0.5 to 0.5)
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;
    
    // Map to angles
    setTilt({
      x: -mouseY * maxTilt,
      y: mouseX * maxTilt,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
