export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const units: [limit: number, secs: number, label: string][] = [
    [60, 60, "minute"],
    [24, 3600, "hour"],
    [7, 86400, "day"],
    [5, 604800, "week"],
    [12, 2629800, "month"],
    [Number.POSITIVE_INFINITY, 31557600, "year"],
  ];

  for (const [limit, secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value < limit) {
      return `${value} ${label}${value === 1 ? "" : "s"} ago`;
    }
  }

  return "Just now";
}
