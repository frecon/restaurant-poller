import * as fs from "fs";
import * as path from "path";
import type { DateAvailability } from "./scraper";

const STATE_FILE = path.join(process.cwd(), "notified-dates.json");

interface NotifiedEntry {
  date: string;
  timeSlots: string[];
  notifiedAt: string;
}

function readState(): Record<string, NotifiedEntry> {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

function writeState(state: Record<string, NotifiedEntry>): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

export function getNotifiedDates(): Set<string> {
  const state = readState();
  const dates = new Set(Object.keys(state));
  console.log(`Loaded ${dates.size} previously notified date(s)`);
  return dates;
}

export function filterNewAvailability(
  results: DateAvailability[],
  notifiedDates: Set<string>
): DateAvailability[] {
  return results.filter((r) => !notifiedDates.has(r.date));
}

export function markDatesNotified(results: DateAvailability[]): void {
  const state = readState();
  for (const result of results) {
    state[result.date] = {
      date: result.date,
      timeSlots: result.timeSlots.map((s) => s.time),
      notifiedAt: new Date().toISOString(),
    };
  }
  writeState(state);
  console.log(`Marked ${results.length} date(s) as notified`);
}
