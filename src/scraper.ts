import { GUEST_COUNT, END_DATE, discoveryMode } from "./config";

const PLACE_ID = "3c4e6";
const TIMES_URL = "https://book.easytable.com/book/ajax/times.asp";

export interface TimeSlot {
  time: string;
  waitlist: boolean;
}

export interface DateAvailability {
  date: string;
  timeSlots: TimeSlot[];
}

function getDateRange(): string[] {
  const dates: string[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(END_DATE + "T00:00:00");

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function parseTimesHtml(html: string): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Match all time span elements: <span class="time ..." data-longtime="6:30 PM">
  const timeRegex =
    /<span\s+class="time([^"]*)"[^>]*data-longtime="([^"]+)"/g;
  let match;

  while ((match = timeRegex.exec(html)) !== null) {
    const classes = match[1];
    const longtime = match[2];
    const isWaitlist =
      classes.includes("wait") || classes.includes("waitlist");

    slots.push({
      time: longtime,
      waitlist: isWaitlist,
    });
  }

  return slots;
}

async function checkDate(date: string): Promise<DateAvailability> {
  const params = new URLSearchParams({
    id: PLACE_ID,
    lang: "EN",
    date,
    qty: String(GUEST_COUNT),
  });

  const res = await fetch(`${TIMES_URL}?${params}`);
  const html = await res.text();

  if (discoveryMode) {
    console.log(`  [${date}] ${html.substring(0, 200)}`);
  }

  // Check for "no availability" indicator
  if (html.includes("nobooking")) {
    return { date, timeSlots: [] };
  }

  const timeSlots = parseTimesHtml(html);
  return { date, timeSlots };
}

export async function checkAvailability(): Promise<DateAvailability[]> {
  const dates = getDateRange();
  console.log(
    `Checking ${dates.length} dates (${dates[0]} → ${dates[dates.length - 1]}), ${GUEST_COUNT} guests`
  );

  const datesToCheck = discoveryMode ? dates.slice(0, 5) : dates;

  const results: DateAvailability[] = [];
  for (const date of datesToCheck) {
    const result = await checkDate(date);

    const bookable = result.timeSlots.filter((s) => !s.waitlist);
    const waitlist = result.timeSlots.filter((s) => s.waitlist);

    if (bookable.length > 0 || discoveryMode) {
      results.push({
        date: result.date,
        // Only include bookable slots (not waitlist-only)
        timeSlots: bookable,
      });
    }

    if (discoveryMode) {
      const status =
        bookable.length > 0
          ? `AVAILABLE: ${bookable.map((s) => s.time).join(", ")}`
          : waitlist.length > 0
            ? `waitlist only: ${waitlist.map((s) => s.time).join(", ")}`
            : "no availability";
      console.log(`  ${date}: ${status}`);
    } else if (bookable.length > 0) {
      console.log(
        `  ${date}: ${bookable.map((s) => s.time).join(", ")}`
      );
    }

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 200));
  }

  const available = results.filter((r) => r.timeSlots.length > 0);
  console.log(
    `Found bookable slots on ${available.length} date(s) out of ${datesToCheck.length}`
  );
  return available;
}
