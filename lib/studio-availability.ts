export type StudioAvailabilityInterval = { start: string; end: string };
export type StudioAvailabilityDay = { weekday: number; intervals: StudioAvailabilityInterval[] };
export type StudioAvailabilitySettings = {
  durationMinutes: number | null;
  cancellationNoticeHours: number | null;
  weeklySchedule: StudioAvailabilityDay[];
  blockedDates: string[];
  retention: StudioRetentionSettings;
};

export type StudioAppointmentTime = { preferredDate: string; preferredTime: string; durationMinutes?: number };
export type StudioRetentionSettings = {
  unconfirmedDays: number | null;
  cancelledDays: number | null;
  completedDays: number | null;
};

export const defaultStudioAvailability: StudioAvailabilitySettings = {
  durationMinutes: null,
  cancellationNoticeHours: null,
  weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({ weekday, intervals: [] })),
  blockedDates: [],
  retention: { unconfirmedDays: null, cancelledDays: null, completedDays: null },
};

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateStudioAvailability(value: unknown): { valid: true; settings: StudioAvailabilitySettings } | { valid: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, message: "La configuración debe ser un objeto." };
  const input = value as Record<string, unknown>;
  const durationMinutes = input.durationMinutes;
  const cancellationNoticeHours = input.cancellationNoticeHours;
  const rawRetention = input.retention;
  let retention = defaultStudioAvailability.retention;
  if (rawRetention !== undefined) {
    if (!rawRetention || typeof rawRetention !== "object" || Array.isArray(rawRetention)) {
      return { valid: false, message: "La política de conservación debe ser un objeto." };
    }
    const policy = rawRetention as Record<string, unknown>;
    const retentionValues = [policy.unconfirmedDays, policy.cancelledDays, policy.completedDays];
    if (retentionValues.some((days) => days !== null && (!Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650))) {
      return { valid: false, message: "Los plazos de conservación deben ser días enteros entre 1 y 3650, o quedar sin configurar." };
    }
    retention = {
      unconfirmedDays: policy.unconfirmedDays as number | null,
      cancelledDays: policy.cancelledDays as number | null,
      completedDays: policy.completedDays as number | null,
    };
  }
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || Number(durationMinutes) < 15 || Number(durationMinutes) > 480 || Number(durationMinutes) % 15 !== 0)) {
    return { valid: false, message: "La duración debe ser múltiplo de 15 minutos, entre 15 y 480." };
  }
  if (cancellationNoticeHours !== null && (!Number.isInteger(cancellationNoticeHours) || Number(cancellationNoticeHours) < 0 || Number(cancellationNoticeHours) > 720)) {
    return { valid: false, message: "El preaviso de cancelación debe estar entre 0 y 720 horas." };
  }
  if (!Array.isArray(input.weeklySchedule) || input.weeklySchedule.length !== 7) return { valid: false, message: "Configurá los siete días de la semana." };
  const weekdays = new Set<number>();
  const weeklySchedule: StudioAvailabilityDay[] = [];
  for (const rawDay of input.weeklySchedule) {
    if (!rawDay || typeof rawDay !== "object" || Array.isArray(rawDay)) return { valid: false, message: "Hay un día de atención inválido." };
    const day = rawDay as Record<string, unknown>;
    if (!Number.isInteger(day.weekday) || Number(day.weekday) < 0 || Number(day.weekday) > 6 || weekdays.has(Number(day.weekday))) {
      return { valid: false, message: "Los días de la semana deben aparecer una sola vez." };
    }
    weekdays.add(Number(day.weekday));
    if (!Array.isArray(day.intervals) || day.intervals.length > 2) return { valid: false, message: "Cada día admite un horario con una pausa." };
    const intervals: StudioAvailabilityInterval[] = [];
    for (const rawInterval of day.intervals) {
      if (!rawInterval || typeof rawInterval !== "object" || Array.isArray(rawInterval)) return { valid: false, message: "Hay un bloque horario inválido." };
      const interval = rawInterval as Record<string, unknown>;
      if (typeof interval.start !== "string" || typeof interval.end !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.end)) {
        return { valid: false, message: "Los horarios deben usar formato HH:MM." };
      }
      if (minutesFromTime(interval.end) <= minutesFromTime(interval.start)) return { valid: false, message: "El fin de cada bloque debe ser posterior al inicio." };
      if (minutesFromTime(interval.start) % 15 !== 0 || minutesFromTime(interval.end) % 15 !== 0) {
        return { valid: false, message: "Los horarios de atención deben comenzar y terminar en intervalos de 15 minutos." };
      }
      intervals.push({ start: interval.start, end: interval.end });
    }
    intervals.sort((left, right) => minutesFromTime(left.start) - minutesFromTime(right.start));
    for (let index = 1; index < intervals.length; index += 1) {
      if (minutesFromTime(intervals[index - 1].end) > minutesFromTime(intervals[index].start)) return { valid: false, message: "Los bloques horarios de un día no pueden superponerse." };
    }
    weeklySchedule.push({ weekday: Number(day.weekday), intervals });
  }
  if (!Array.isArray(input.blockedDates) || input.blockedDates.length > 366 || !input.blockedDates.every(isCalendarDate)) {
    return { valid: false, message: "Las fechas bloqueadas deben ser fechas válidas y no superar 366." };
  }

  return {
    valid: true,
    settings: {
      durationMinutes: durationMinutes as number | null,
      cancellationNoticeHours: cancellationNoticeHours as number | null,
      weeklySchedule: weeklySchedule.sort((left, right) => left.weekday - right.weekday),
      blockedDates: [...new Set(input.blockedDates as string[])].sort(),
      retention,
    },
  };
}

export function getStudioRetentionExpiry(days: number | null, now: Date): Date | undefined {
  if (days === null) return undefined;
  if (!Number.isInteger(days) || days < 1 || days > 3650 || Number.isNaN(now.getTime())) {
    throw new RangeError("El plazo o la fecha de conservación no es válido");
  }
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function weekdayForStudioDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function currentStudioDateTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function getStudioAvailableStartTimes(
  date: string,
  settings: StudioAvailabilitySettings,
  confirmedAppointments: StudioAppointmentTime[] = [],
  now = new Date(),
) {
  if (!isCalendarDate(date) || settings.durationMinutes === null || settings.blockedDates.includes(date)) return [];
  const weekday = weekdayForStudioDate(date);
  const intervals = settings.weeklySchedule.find((day) => day.weekday === weekday)?.intervals ?? [];
  const current = currentStudioDateTime(now);
  const duration = settings.durationMinutes;
  const occupied = confirmedAppointments
    .filter((appointment) => appointment.preferredDate === date && /^([01]\d|2[0-3]):[0-5]\d$/.test(appointment.preferredTime))
    .map((appointment) => {
      const start = minutesFromTime(appointment.preferredTime);
      return { start, end: start + (appointment.durationMinutes ?? duration) };
    });

  const slots: string[] = [];
  for (const interval of intervals) {
    const startBoundary = minutesFromTime(interval.start);
    const endBoundary = minutesFromTime(interval.end);
    for (let start = startBoundary; start + duration <= endBoundary; start += duration) {
      if (date === current.date && start <= current.minutes) continue;
      if (occupied.some((appointment) => start < appointment.end && start + duration > appointment.start)) continue;
      slots.push(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function getStudioAppointmentSlotLockIds(date: string, time: string, durationMinutes: number) {
  const start = minutesFromTime(time);
  const ids: string[] = [];
  for (let minute = start; minute < start + durationMinutes; minute += 15) {
    ids.push(`${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return ids;
}
