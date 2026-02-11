import { Firestore } from "@google-cloud/firestore";
import { config } from "./config";
import type { DateAvailability } from "./scraper";

const COLLECTION = "notified-dates";

let db: Firestore;

function getDb(): Firestore {
  if (!db) {
    db = new Firestore({
      projectId: config.gcpProjectId || undefined,
    });
  }
  return db;
}

export async function getNotifiedDates(): Promise<Set<string>> {
  const snapshot = await getDb().collection(COLLECTION).get();
  const dates = new Set<string>();
  for (const doc of snapshot.docs) {
    dates.add(doc.id);
  }
  console.log(`Loaded ${dates.size} previously notified date(s) from Firestore`);
  return dates;
}

export function filterNewAvailability(
  results: DateAvailability[],
  notifiedDates: Set<string>
): DateAvailability[] {
  return results.filter((r) => !notifiedDates.has(r.date));
}

export async function markDatesNotified(
  results: DateAvailability[]
): Promise<void> {
  const db = getDb();
  const batch = db.batch();

  for (const result of results) {
    const ref = db.collection(COLLECTION).doc(result.date);
    batch.set(ref, {
      date: result.date,
      timeSlots: result.timeSlots.map((s) => s.time),
      notifiedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
  console.log(`Marked ${results.length} date(s) as notified in Firestore`);
}
