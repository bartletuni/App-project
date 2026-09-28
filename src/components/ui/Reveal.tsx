"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  /** Travel distance in px before settling. */
  distance?: number;
  once?: boolean;
  /**
   * Above-the-fold content: render it visible from the server and skip the
   * reveal. Framer Motion writes `initial` into the server HTML, so without
   * this a page's headline ships at `opacity: 0` and stays invisible until the
   * JavaScript bundle has downloaded and hydrated — which makes it the page's
   * Largest Contentful Paint (a search ranking signal) and leaves a visitor
   * who arrived from a link looking at an empty hero.
   */
  priority?: boolean;
}

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 40 },
  down: { x: 0, y: -40 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered reveal. Fades and slides children into place the
 * first time they enter the viewport.
 */
export default function Reveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  distance,
  once = true,
  priority = false,
}: RevealProps) {
  if (priority) return <div className={className}>{children}</div>;

  const base = offset[direction];
  const from = {
    opacity: 0,
    x: distance != null ? Math.sign(base.x) * distance : base.x,
    y: distance != null ? Math.sign(base.y) * distance : base.y,
  };

  return (
    <motion.div
      className={className}
      initial={from}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
