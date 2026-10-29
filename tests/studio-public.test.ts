import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStudioWhatsAppHref } from "../lib/studio-contact";

const root = process.cwd();

test("Studio WhatsApp links use the configured number and safely encode messages", () => {
  assert.equal(
    getStudioWhatsAppHref("Hola, turno", "+54 (221) 220-3747"),
    "https://wa.me/542212203747?text=Hola%2C%20turno",
  );
  assert.equal(getStudioWhatsAppHref("Hola", ""), null);
});

test("Studio contact, booking form, and footer share WhatsApp and privacy links", () => {
  const contact = readFileSync(`${root}/app/contacto/page.tsx`, "utf8");
  const booking = readFileSync(`${root}/app/turnos/page.tsx`, "utf8");
  const footer = readFileSync(`${root}/app/components/Footer.tsx`, "utf8");
  const policy = readFileSync(`${root}/app/politica-de-privacidad/page.tsx`, "utf8");

  assert.ok(contact.includes("getStudioWhatsAppHref"));
  assert.ok(booking.includes("getStudioWhatsAppHref"));
  assert.ok(footer.includes("getStudioWhatsAppHref"));
  assert.ok(booking.includes('name="privacyConsent"'));
  assert.ok(booking.includes('href="/politica-de-privacidad"'));
  assert.ok(footer.includes('href="/politica-de-privacidad"'));
  assert.ok(policy.includes("solicitudes de turno"));
  assert.ok(policy.includes("responsable"));
  assert.equal(policy.includes("[EMAIL DE CONTACTO]"), false);
});

test("Vercel Studio settings explicitly omit AVG ecommerce cron jobs", () => {
  const config = JSON.parse(readFileSync(`${root}/vercel.studio.json`, "utf8")) as { crons?: unknown[] };
  assert.deepEqual(config.crons, []);
});
