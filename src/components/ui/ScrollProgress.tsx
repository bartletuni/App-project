"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * A thin gradient bar pinned to the top of the viewport that fills
 * as the user scrolls through the page. Purely decorative.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[60] h-1 origin-left bg-gradient-to-r from-clay-600 via-clay-400 to-ember-400 shadow-[0_0_12px_rgba(217,142,61,0.6)]"
    />
  );
}
