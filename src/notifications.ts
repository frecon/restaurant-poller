import twilio from "twilio";
import nodemailer from "nodemailer";
import { config, PARENT_URL, GUEST_COUNT } from "./config";
import type { DateAvailability } from "./scraper";

function formatSmsBody(results: DateAvailability[]): string {
  if (results.length === 0) {
    return [
      `Åre Nature Studio — inga lediga bord`,
      `Kollade alla datum för ${GUEST_COUNT} gäster, inget ledigt.`,
    ].join("\n");
  }

  const lines = results.map((r) => {
    const times = r.timeSlots.map((s) => s.time).join(", ");
    return `${r.date}: ${times}`;
  });

  return [
    `🍽️ Åre Nature Studio — bord ledigt!`,
    "",
    ...lines,
    "",
    `Boka: ${PARENT_URL}`,
  ].join("\n");
}

function formatEmailHtml(results: DateAvailability[]): string {
  if (results.length === 0) {
    return `
      <h2>Åre Nature Studio — Inga lediga bord</h2>
      <p>Kollade alla datum för ${GUEST_COUNT} gäster — inget ledigt just nu.</p>
      <p><a href="${PARENT_URL}">Kolla själv →</a></p>
    `;
  }

  const rows = results
    .map((r) => {
      const times = r.timeSlots.map((s) => s.time).join(", ");
      return `<tr><td style="padding:8px;border:1px solid #ddd">${r.date}</td><td style="padding:8px;border:1px solid #ddd">${times}</td></tr>`;
    })
    .join("\n");

  return `
    <h2>Åre Nature Studio — Bord ledigt!</h2>
    <p>Nya lediga tider hittades för ${GUEST_COUNT} gäster:</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr style="background:#f5f5f5">
        <th style="padding:8px;border:1px solid #ddd;text-align:left">Datum</th>
        <th style="padding:8px;border:1px solid #ddd;text-align:left">Tider</th>
      </tr>
      ${rows}
    </table>
    <p><a href="${PARENT_URL}">Boka nu →</a></p>
  `;
}

async function sendSms(results: DateAvailability[]): Promise<void> {
  const client = twilio(config.twilio.accountSid, config.twilio.authToken);
  const body = formatSmsBody(results);

  await client.messages.create({
    body,
    from: config.twilio.fromNumber,
    to: config.notifyPhone,
  });

  console.log(`SMS sent to ${config.notifyPhone}`);
}

async function sendEmail(results: DateAvailability[]): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  const hasAvailability = results.length > 0;

  await transporter.sendMail({
    from: config.smtp.user,
    to: config.notifyEmail,
    subject: hasAvailability
      ? `Åre Nature Studio — Bord ledigt! (${results.length} datum)`
      : `Åre Nature Studio — Inga lediga bord`,
    html: formatEmailHtml(results),
  });

  console.log(`Email sent to ${config.notifyEmail}`);
}

export async function notify(results: DateAvailability[]): Promise<void> {
  const outcomes = await Promise.allSettled([
    sendSms(results),
    sendEmail(results),
  ]);

  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      console.error("Notification failed:", outcome.reason);
    }
  }
}
