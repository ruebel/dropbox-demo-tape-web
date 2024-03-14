export function SortIcon({ size = 24 }: { size: number }) {
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
      <path d="M3 18h6v-2H3zM3 6v2h18V6zm0 7h12v-2H3z"></path>
    </svg>
  );
}
