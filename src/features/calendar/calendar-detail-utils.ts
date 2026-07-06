export type CalendarDetails = {
  customerName: string;
  customerPhone: string;
  depositAmount: number | null;
  fromTime: string | null;
  toTime: string | null;
};

export type CalendarDetailPair = [string, string];

export function getCalendarDetailLines({
  customerName,
  customerPhone,
  depositAmount,
  fromTime,
  toTime,
}: CalendarDetails) {
  return [
    customerName ? `Name: ${customerName}` : "",
    customerPhone ? `Phone: ${customerPhone}` : "",
    getTimeRange(fromTime, toTime),
    depositAmount !== null ? `Deposit: ${formatDeposit(depositAmount)}` : "",
  ].filter(Boolean);
}

export function getCalendarDetailPairs(
  details: CalendarDetails,
): CalendarDetailPair[] {
  return getCalendarDetailLines(details).map((detail) => {
    const [label, ...valueParts] = detail.split(": ");

    return [label, valueParts.join(": ")] as CalendarDetailPair;
  });
}

export function getTimeRange(fromTime: string | null, toTime: string | null) {
  return fromTime && toTime ? `Time: ${fromTime} - ${toTime}` : "";
}

export function formatDeposit(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}
