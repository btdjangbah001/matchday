export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2.5"
        y="5.5"
        width="27"
        height="19"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 5.5v19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.55"
      />
      <circle
        cx="16"
        cy="15"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.55"
      />
      <path
        d="M2.5 11.5h3M29.5 11.5h-3M2.5 18.5h3M29.5 18.5h-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.55"
      />
      <path
        d="M11 28.5h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M16 24.5v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-8 w-8",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={`${markClassName} text-brand`} />
      <span className="text-[1.05rem] font-bold tracking-tight">
        Match<span className="text-brand-strong">day</span>
      </span>
    </span>
  );
}
