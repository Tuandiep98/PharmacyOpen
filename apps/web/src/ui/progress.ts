/** Keep progress updates out of layout; the track defines the actual width. */
export function progressStyle(value: number): React.CSSProperties {
  return {
    width: "100%",
    transform: `scaleX(${Math.max(0, Math.min(1, value))})`,
    transformOrigin: "left center",
  };
}
