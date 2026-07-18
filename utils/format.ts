export function toPercent(current: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / max) * 100));
}
