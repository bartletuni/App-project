"use client";

import { useRef, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** How strongly the element is pulled toward the cursor (px at edge). */
  strength?: number;
}

/**
 * Wraps an element so it is gently "pulled" toward the cursor while
 * hovered, then springs back to rest on leave. Great for CTAs.
 */
export default function Magnetic({
  children,
  className = "",
  strength = 0.4,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 250, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 250, damping: 18, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
