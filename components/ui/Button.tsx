// components/ui/Button.tsx — CVA + Tailwind v4, presentational (bisa RSC)

import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/20 hover:shadow-xl hover:shadow-brand-900/30 hover:-translate-y-0.5 focus-visible:ring-brand-500",
        secondary:
          "bg-gradient-to-br from-sky-glow to-brand-700 text-white shadow-lg shadow-sky-900/20 hover:-translate-y-0.5 focus-visible:ring-sky-glow",
        ghost:
          "bg-white/70 backdrop-blur border border-brand-200 text-brand-800 hover:bg-white focus-visible:ring-brand-400 dark:bg-white/10 dark:border-white/20 dark:text-white",
        danger:
          "bg-gradient-to-br from-danger-glow to-red-700 text-white shadow-lg shadow-red-900/20 hover:-translate-y-0.5 focus-visible:ring-danger-glow",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  const classes = [buttonVariants({ variant, size }), className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}
