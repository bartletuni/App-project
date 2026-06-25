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
      className="fixed top-0 left-0 right-0 z-[60] h-1 origin-left bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
    />
  );
}
