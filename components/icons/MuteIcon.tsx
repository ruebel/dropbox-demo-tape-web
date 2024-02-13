export function MuteIcon({ size = 24 }: { size: number }) {
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
      <path d="M7 9v6h4l5 5V4l-5 5z"></path>
    </svg>
  );
}
