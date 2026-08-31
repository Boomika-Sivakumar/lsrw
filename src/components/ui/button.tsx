import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gradient" | "outline" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/25",
  gradient: "bg-gradient-brand text-white hover:opacity-95 shadow-lift",
  outline: "border border-ink-200 bg-white text-ink-700 hover:border-primary-400 hover:text-primary-700",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  soft: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  danger: "bg-red-50 text-red-600 hover:bg-red-100",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-sm gap-2 rounded-xl",
  lg: "px-5 py-2.5 text-sm gap-2 rounded-xl",
  xl: "px-7 py-3.5 text-base gap-2.5 rounded-2xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", full, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}