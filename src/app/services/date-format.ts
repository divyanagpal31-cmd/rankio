export function formatReadableDate(value?: string | number | Date | null) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = date.getDate();
  const month = date.toLocaleString(undefined, { month: "long" });
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
}
