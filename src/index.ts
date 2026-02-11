import { checkAvailability } from "./scraper";
import { getNotifiedDates, filterNewAvailability, markDatesNotified } from "./state";
import { notify } from "./notifications";
import { discoveryMode } from "./config";

async function main() {
  console.log(
    `[${new Date().toISOString()}] Restaurant poller starting...${discoveryMode ? " (DISCOVERY MODE)" : ""}`
  );

  // Step 1: Scrape availability
  const allSlots = await checkAvailability();
  console.log(`Scraper found availability on ${allSlots.length} date(s)`);

  if (allSlots.length === 0) {
    console.log("No availability found. Done.");
    return;
  }

  if (discoveryMode) {
    console.log("Discovery mode — skipping notifications.");
    console.log("Results:", JSON.stringify(allSlots, null, 2));
    return;
  }

  // Step 2: Dedup against notified-dates.json
  const notifiedDates = getNotifiedDates();
  const newSlots = filterNewAvailability(allSlots, notifiedDates);

  if (newSlots.length === 0) {
    console.log("All available dates already notified. Done.");
    return;
  }

  console.log(`${newSlots.length} new date(s) with availability:`);
  for (const slot of newSlots) {
    console.log(
      `  ${slot.date}: ${slot.timeSlots.map((s) => s.time).join(", ")}`
    );
  }

  // Step 3: Notify
  await notify(newSlots);

  // Step 4: Mark as notified
  markDatesNotified(newSlots);

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
