"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLMotionProps<"div"> & {
  interactive?: boolean;
  sheen?: boolean;
};

/**
 * Base Liquid-Glass surface. Optionally interactive (lifts + specular edge
 * sharpens on hover) and can carry a diagonal refractive sheen streak.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, interactive = false, sheen = true, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "glass relative overflow-hidden rounded-3xl",
        sheen && "glass-sheen",
        interactive && "glass-interactive cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
GlassCard.displayName = "GlassCard";
