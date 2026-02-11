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

  if (discoveryMode) {
    console.log("Discovery mode — skipping notifications.");
    console.log("Results:", JSON.stringify(allSlots, null, 2));
    return;
  }

  // Step 2: Always notify with current status
  await notify(allSlots);

  // Step 3: If new availability, mark as notified for dedup
  if (allSlots.length > 0) {
    const notifiedDates = getNotifiedDates();
    const newSlots = filterNewAvailability(allSlots, notifiedDates);
    if (newSlots.length > 0) {
      markDatesNotified(newSlots);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
