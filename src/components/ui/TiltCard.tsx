"use client";

import { useRef, ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  intensity?: number;
  /** Tailwind/CSS color for the cursor-following spotlight. */
  glowColor?: string;
}

/**
 * A card that tilts in 3D toward the pointer and renders a soft
 * radial spotlight that tracks the cursor. Falls back gracefully
 * to a static card when the pointer leaves.
 */
export default function TiltCard({
  children,
  className = "",
  intensity = 8,
  glowColor = "rgba(99,102,241,0.18)",
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  const rotateX = useSpring(
    useTransform(y, [0, 1], [intensity, -intensity]),
    { stiffness: 200, damping: 18 }
  );
  const rotateY = useSpring(
    useTransform(x, [0, 1], [-intensity, intensity]),
    { stiffness: 200, damping: 18 }
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    x.set(px);
    y.set(py);
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleLeave = () => {
    x.set(0.5);
    y.set(0.5);
    mouseX.set(-200);
    mouseY.set(-200);
  };

  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
    >
      <motion.div
        aria-hidden="true"
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div style={{ transform: "translateZ(40px)" }} className="relative h-full">
        {children}
      </div>
    </motion.div>
  );
}
