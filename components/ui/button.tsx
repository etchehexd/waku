"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waku-400 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-waku-400 to-waku-600 text-white shadow-glow ring-1 ring-inset ring-white/10 transition-[filter,box-shadow] hover:brightness-110 hover:ring-white/20",
        /**
         * The app's headline call to action (Add to Library / Add to list).
         *
         * It renders in the PRIMARY accent family (`waku`, driven by --wk-h /
         * --wk-s), which is the hue the settings swatch leads with — so the
         * button always reads as "the color I picked". Never hard-code a hue
         * here: any literal color, or the secondary `iris` family, makes this
         * CTA drift from the user's selection. Feedback is a brightness shift
         * plus a thin border highlight, NOT a glow.
         */
        accent:
          "bg-gradient-to-b from-waku-500 to-waku-700 text-white shadow-glow ring-1 ring-inset ring-white/12 transition-[filter,box-shadow] hover:brightness-110 hover:ring-white/25",
        glass:
          "glass glass-sheen text-white/90 hover:text-white hover:border-waku-300/50",
        // Liquid-glass but emphasized — the primary action without the solid fill.
        "glass-primary":
          "glass glass-sheen text-white ring-1 ring-inset ring-waku-300/45 hover:ring-waku-200/65 hover:text-white",
        ghost: "text-white/70 hover:bg-white/5 hover:text-white",
        outline:
          "border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 hover:border-white/25",
        danger:
          "bg-gradient-to-b from-rose-500 to-rose-700 text-white hover:from-rose-400",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
