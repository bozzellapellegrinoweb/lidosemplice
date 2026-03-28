import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon" | "text";
}

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-lg" },
    md: { icon: 32, text: "text-2xl" },
    lg: { icon: 48, text: "text-4xl" },
  };

  const s = sizes[size];

  const WavesIcon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00F0B5" />
          <stop offset="50%" stopColor="#00BFFF" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      {/* 4 onde come nel logo */}
      <path
        d="M4 12 Q10 6, 16 12 Q22 18, 28 12 Q34 6, 40 12 Q43 9, 44 10"
        stroke="url(#waveGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 20 Q10 14, 16 20 Q22 26, 28 20 Q34 14, 40 20 Q43 17, 44 18"
        stroke="url(#waveGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 28 Q10 22, 16 28 Q22 34, 28 28 Q34 22, 40 28 Q43 25, 44 26"
        stroke="url(#waveGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 36 Q10 30, 16 36 Q22 42, 28 36 Q34 30, 40 36 Q43 33, 44 34"
        stroke="url(#waveGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <WavesIcon />
      </span>
    );
  }

  if (variant === "text") {
    return (
      <span
        className={cn(
          "font-semibold tracking-tight text-white",
          s.text,
          className
        )}
      >
        lidofacile<span className="text-brand-azure">.it</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <WavesIcon />
      <span className={cn("font-semibold tracking-tight", s.text)}>
        lidofacile<span className="text-brand-azure">.it</span>
      </span>
    </span>
  );
}
