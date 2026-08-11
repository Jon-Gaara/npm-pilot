export function Spinner({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-transparent border-t-current animate-spin ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="处理中"
    />
  )
}
