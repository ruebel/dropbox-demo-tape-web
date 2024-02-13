export function PauseIcon({ size = 24 }: { size: number }) {
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
      <path d="M6 19h4V5H6zm8-14v14h4V5z"></path>
    </svg>
  );
}
