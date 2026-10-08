interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Fill a relative parent (replaces next/image `fill`). */
  fill?: boolean;
}

/**
 * Product catalog images may come from any merchant-pasted URL (Unsplash, iStock, etc.).
 * Use a native img so we are not limited to next.config remotePatterns.
 */
export default function ProductImage({
  src,
  alt,
  className = "",
  fill = false,
}: ProductImageProps) {
  const sizing = fill
    ? "absolute inset-0 h-full w-full object-cover"
    : "object-cover";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- merchant URLs are arbitrary external hosts
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`${sizing} ${className}`.trim()}
    />
  );
}
