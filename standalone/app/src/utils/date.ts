/**
 * Formats an ISO date string to "DD MMM HH:mm YYYY" format.
 *
 * Example:
 *   formatUpadtedDate("2025-05-18T09:41:18.550Z")
 *   => "18 May 09:41 2025"
 *
 * @param updatedAt - An ISO date string (e.g., "2025-05-18T09:41:18.550Z")
 * @returns A formatted string like "18 May 09:41 2025"
 */
export const formatUpadtedDate = (updatedAt: string) => {
  const date = new Date(updatedAt)

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    hour12: false,
  }

  return date.toLocaleString("en-GB", options).replace(",", "")
}
