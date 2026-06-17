/**
 * Branded SVG placeholder for products without a real image.
 * Navy background, gold Neon Visuals "NV" monogram watermark, product name.
 * Fills its (relatively-positioned) parent. Server-safe — no client JS.
 */
interface PlaceholderImageProps {
  name: string;
  className?: string;
}

export function PlaceholderImage({ name, className }: PlaceholderImageProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-navy ${className ?? ""}`}
      role="img"
      aria-label={`${name} — image coming soon`}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-1/3 w-1/3 opacity-90"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#C4A35A"
          strokeWidth="2"
          strokeOpacity="0.4"
        />
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fontSize="44"
          fontWeight="700"
          fill="#C4A35A"
          fontFamily="var(--font-numbers), system-ui, sans-serif"
        >
          NV
        </text>
      </svg>
      <span className="mt-4 line-clamp-2 max-w-[80%] px-4 text-center text-xs font-medium uppercase tracking-widest text-cream/70">
        {name}
      </span>
    </div>
  );
}
