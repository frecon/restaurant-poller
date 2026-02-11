import { checkAvailability } from "./scraper";
import { notify } from "./notifications";
import { discoveryMode } from "./config";

async function main() {
  console.log(
    `[${new Date().toISOString()}] Restaurant poller starting...${discoveryMode ? " (DISCOVERY MODE)" : ""}`
  );

  const allSlots = await checkAvailability();
  console.log(`Scraper found availability on ${allSlots.length} date(s)`);

  if (discoveryMode) {
    console.log("Discovery mode — skipping notifications.");
    console.log("Results:", JSON.stringify(allSlots, null, 2));
    return;
  }

  await notify(allSlots);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
