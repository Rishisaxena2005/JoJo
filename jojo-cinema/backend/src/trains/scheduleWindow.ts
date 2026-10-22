export const TRAIN_SCHEDULE_HORIZON_DAYS = 120;
const INDIA_OFFSET_MINUTES = 5 * 60 + 30;
const LOCATION_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru', bombay: 'mumbai', madras: 'chennai', calcutta: 'kolkata',
};

export function normalizeRailLocation(value: string): string {
  const normalized = value.trim().toLowerCase();
  return LOCATION_ALIASES[normalized] ?? normalized;
}

export function indiaDateAtOffset(daysFromToday = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function isDateInsideTrainScheduleWindow(value: string): boolean {
  const requested = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(requested.getTime()) || requested.toISOString().slice(0, 10) !== value) return false;
  const first = new Date(`${indiaDateAtOffset(0)}T00:00:00.000Z`);
  const last = new Date(`${indiaDateAtOffset(TRAIN_SCHEDULE_HORIZON_DAYS)}T00:00:00.000Z`);
  return requested >= first && requested <= last;
}

export function indiaLocalDateTime(date: string, minuteOfDay: number): Date {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCMinutes(minuteOfDay - INDIA_OFFSET_MINUTES);
  return value;
}

export type TrainAvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'INSUFFICIENT_FOR_PARTY' | 'SOLD_OUT';

export function trainAvailabilityStatus(availableSeats: number, requestedPassengers: number): TrainAvailabilityStatus {
  if (availableSeats <= 0) return 'SOLD_OUT';
  if (availableSeats < requestedPassengers) return 'INSUFFICIENT_FOR_PARTY';
  if (availableSeats <= 10) return 'LIMITED';
  return 'AVAILABLE';
}
