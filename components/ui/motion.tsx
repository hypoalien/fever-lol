"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type Transition,
} from "framer-motion";
import { useEffect, type ReactNode } from "react";

/**
 * Motion primitives.
 *
 * Two rules hold throughout. Nothing here delays interaction — animation runs
 * on what is already painted and on elements that are already clickable. And
 * every effect collapses to nothing under prefers-reduced-motion, which the
 * hook below reports honestly rather than being ignored.
 *
 * Durations are short on purpose. Anything past ~250ms on a dashboard reads as
 * lag rather than polish; the point is to make change legible, not decorative.
 */

/** Quick, slightly overshooting. Used for anything entering. */
const ENTER: Transition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
};

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ENTER, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its children in.
 *
 * The stagger is capped so a long table does not take a visible age to finish
 * — after the first handful the remaining rows arrive together.
 */
export function Stagger({
  children,
  className,
  step = 0.035,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduced ? 0 : step, delayChildren: 0 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: ENTER },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts a number up to its value.
 *
 * Only on first mount and only for figures that changed — animating a value
 * that is already correct is noise. Reduced motion snaps straight to the
 * final number.
 */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const spring = useSpring(0, { stiffness: 90, damping: 20, mass: 0.6 });
  const text = useTransform(spring, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (reduced) {
      spring.jump(value);
      return;
    }
    spring.set(value);
  }, [spring, value, reduced]);

  if (reduced) return <span className={className}>{format(value)}</span>;
  return <motion.span className={className}>{text}</motion.span>;
}

/** Cross-fades between loading and loaded so content does not pop. */
export function Swap({
  isLoading,
  skeleton,
  children,
}: {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isLoading ? "loading" : "loaded"}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {isLoading ? skeleton : children}
      </motion.div>
    </AnimatePresence>
  );
}

/** A row that responds to press. Subtle enough to feel physical, not bouncy. */
export function PressableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
}
