/**
 * Order request dates from validorders are formatted as dd-MM-yyyy.
 */
export function parseOrderRequestedDate(dateRequested: string): Date | null {
  if (!dateRequested?.trim()) {
    return null;
  }

  const match = dateRequested.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const parsed = new Date(year, month, day);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function collectionDateDiffersFromOrderRequest(
  collectionDate: Date | undefined | null,
  dateRequested: string,
): boolean {
  if (!collectionDate || !(collectionDate instanceof Date) || Number.isNaN(collectionDate.getTime())) {
    return false;
  }

  const requestedDate = parseOrderRequestedDate(dateRequested);
  if (!requestedDate) {
    return false;
  }

  return !isSameCalendarDay(collectionDate, requestedDate);
}
