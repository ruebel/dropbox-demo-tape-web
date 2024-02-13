export function ChevronUpIcon({ size = 24 }: { size: number }) {
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
      <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
    </svg>
  );
}
