"use client";

import { useRef, ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import useFinePointer from "./useFinePointer";

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
 * radial spotlight that tracks the cursor.
 *
 * On touch devices (no fine pointer) the 3D transforms and spotlight
 * are disabled — the card renders flat with a subtle tap-press effect
 * so it stays interactive and never looks broken.
 */
export default function TiltCard({
  children,
  className = "",
  intensity = 8,
  glowColor = "rgba(230,168,95,0.20)",
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();

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

  // Touch / coarse-pointer path: flat card with a tap-press cue.
  if (!fine) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`relative ${className}`}
      >
        <div className="relative h-full">{children}</div>
      </motion.div>
    );
  }

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
