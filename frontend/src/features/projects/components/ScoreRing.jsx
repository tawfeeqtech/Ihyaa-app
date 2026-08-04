"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * Animated circular AI score ring — fills up when scrolled into view.
 */
export function ScoreRing({ score, size = 180, color = "var(--color-primary-600)" }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { once: true, margin: "-60px" });

  return (
    <div ref={wrapRef} className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: circumference * (1 - score / 100) } : {}}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.p
          className="font-heading text-4xl font-bold text-primary-600"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
        >
          {score}
        </motion.p>
        <p className="text-xs font-medium text-text-secondary">/100</p>
      </div>
    </div>
  );
}
