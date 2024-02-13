export function PreviousIcon({ size = 24 }: { size: number }) {
  return (
    <svg
      focusable="false"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        fill: "currentColor",
        height: size,
        overflow: "hidden",
      }}
    >
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"></path>
    </svg>
  );
}
