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

test("Studio WhatsApp links remain available with the documented public contact as fallback", () => {
  const configuredNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  try {
    assert.equal(getStudioWhatsAppHref("Hola"), "https://wa.me/542212203747?text=Hola");
  } finally {
    if (configuredNumber === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = configuredNumber;
  }
});

test("Studio contact, booking form, and footer share WhatsApp and privacy links", () => {
  const contact = readFileSync(`${root}/app/contacto/page.tsx`, "utf8");
  const booking = readFileSync(`${root}/app/turnos/page.tsx`, "utf8");
  const footer = readFileSync(`${root}/app/components/Footer.tsx`, "utf8");
  const policy = readFileSync(`${root}/app/politica-de-privacidad/page.tsx`, "utf8");
  const account = readFileSync(`${root}/app/mi-cuenta/page.tsx`, "utf8");
  const adminAppointments = readFileSync(`${root}/app/admin/turnos/page.tsx`, "utf8");

  assert.ok(contact.includes("getStudioWhatsAppHref"));
  assert.ok(booking.includes("getStudioWhatsAppHref"));
  assert.ok(footer.includes("getStudioWhatsAppHref"));
  assert.ok(booking.includes('name="privacyConsent"'));
  assert.ok(booking.includes('href="/politica-de-privacidad"'));
  assert.ok(account.includes('href="/turnos"'));
  assert.ok(adminAppointments.includes('item.userId ? "Cuenta registrada" : "Invitado"'));
  assert.ok(footer.includes('href="/politica-de-privacidad"'));
  assert.ok(policy.includes("solicitudes de turno"));
  assert.ok(policy.includes("responsable"));
  assert.ok(policy.includes("identidad legal"));
  assert.ok(policy.includes("plazo no definido"));
  assert.ok(policy.includes("permanecen deshabilitados"));
  assert.ok(policy.includes("plazo pendiente de definición y aprobación"));
  assert.equal(policy.includes("90 días"), false);
  assert.equal(policy.includes("12 meses"), false);
  assert.equal(policy.includes("[EMAIL DE CONTACTO]"), false);
});

test("Vercel Studio settings explicitly omit AVG ecommerce cron jobs", () => {
  const config = JSON.parse(readFileSync(`${root}/vercel.studio.json`, "utf8")) as { crons?: unknown[] };
  assert.deepEqual(config.crons, []);
});
