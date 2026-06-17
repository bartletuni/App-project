import { format } from "date-fns";

export function formatDate(date: string | Date | number, formatString: string = "MMM d, yyyy"): string {
  return format(new Date(date), formatString);
}
