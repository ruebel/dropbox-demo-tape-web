export function NextIcon({ size = 24 }: { size: number }) {
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
      <path d="m6 18 8.5-6L6 6zM16 6v12h2V6z"></path>
    </svg>
  );
}
