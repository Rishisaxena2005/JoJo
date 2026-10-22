import { Prisma, PrismaClient } from '@prisma/client';
import { indiaDateAtOffset, indiaLocalDateTime, TRAIN_SCHEDULE_HORIZON_DAYS } from '../src/trains/scheduleWindow';

const prisma = new PrismaClient();

const stations = [
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra' },
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra' },
] as const;

type ClassPlan = { code: string; fare: number; seats: number };
type TrainPlan = {
  number: string; name: string; from: string; to: string;
  departureMinute: number; durationMinutes: number; classes: ClassPlan[];
};

const trains: TrainPlan[] = [
  { number: 'JJ101', name: 'JoJo Deccan Express', from: 'PUNE', to: 'CSMT', departureMinute: 7 * 60, durationMinutes: 210, classes: [
    { code: '2S', fare: 180, seats: 120 }, { code: 'CC', fare: 560, seats: 80 }, { code: 'EC', fare: 920, seats: 36 },
  ] },
  { number: 'JJ103', name: 'JoJo Sahyadri Intercity', from: 'PUNE', to: 'CSMT', departureMinute: 15 * 60, durationMinutes: 240, classes: [
    { code: '2S', fare: 210, seats: 120 }, { code: 'CC', fare: 620, seats: 80 }, { code: 'EC', fare: 980, seats: 36 },
  ] },
  { number: 'JJ301', name: 'JoJo Bengaluru Night Express', from: 'PUNE', to: 'SBC', departureMinute: 21 * 60, durationMinutes: 780, classes: [
    { code: 'SL', fare: 650, seats: 180 }, { code: '3A', fare: 1650, seats: 72 }, { code: '2A', fare: 2350, seats: 48 }, { code: '1A', fare: 3900, seats: 24 },
  ] },
  { number: 'JJ401', name: 'JoJo Pune–Delhi Superfast', from: 'PUNE', to: 'NDLS', departureMinute: 16 * 60, durationMinutes: 1080, classes: [
    { code: 'SL', fare: 1200, seats: 180 }, { code: '3A', fare: 2800, seats: 72 }, { code: '2A', fare: 3950, seats: 48 }, { code: '1A', fare: 6500, seats: 24 },
  ] },
  { number: 'JJ501', name: 'JoJo Mumbai Rajdhani Demo', from: 'CSMT', to: 'NDLS', departureMinute: 16 * 60 + 30, durationMinutes: 960, classes: [
    { code: '3A', fare: 1850, seats: 72 }, { code: '2A', fare: 2800, seats: 48 }, { code: '1A', fare: 4800, seats: 24 },
  ] },
  { number: 'JJ601', name: 'JoJo Coromandel Demo Express', from: 'CSMT', to: 'MAS', departureMinute: 14 * 60, durationMinutes: 1320, classes: [
    { code: 'SL', fare: 900, seats: 180 }, { code: '3A', fare: 2200, seats: 72 }, { code: '2A', fare: 3150, seats: 48 },
  ] },
  { number: 'JJ701', name: 'JoJo Deccan–Hyderabad Express', from: 'CSMT', to: 'HYB', departureMinute: 19 * 60, durationMinutes: 840, classes: [
    { code: 'SL', fare: 600, seats: 180 }, { code: '3A', fare: 1500, seats: 72 }, { code: '2A', fare: 2150, seats: 48 },
  ] },
  { number: 'JJ801', name: 'JoJo Gujarat Intercity', from: 'CSMT', to: 'ADI', departureMinute: 6 * 60 + 15, durationMinutes: 480, classes: [
    { code: '2S', fare: 300, seats: 120 }, { code: 'CC', fare: 780, seats: 80 }, { code: 'EC', fare: 1240, seats: 36 },
  ] },
  { number: 'JJ901', name: 'JoJo Pink City Express', from: 'NDLS', to: 'JP', departureMinute: 7 * 60, durationMinutes: 300, classes: [
    { code: '2S', fare: 200, seats: 120 }, { code: 'CC', fare: 520, seats: 80 }, { code: 'EC', fare: 900, seats: 36 },
  ] },
  { number: 'JJ1001', name: 'JoJo Awadh Express', from: 'NDLS', to: 'LKO', departureMinute: 20 * 60, durationMinutes: 600, classes: [
    { code: 'SL', fare: 500, seats: 180 }, { code: '3A', fare: 1200, seats: 72 }, { code: '2A', fare: 1750, seats: 48 },
  ] },
  { number: 'JJ1101', name: 'JoJo Eastern Corridor Express', from: 'NDLS', to: 'HWH', departureMinute: 17 * 60, durationMinutes: 1020, classes: [
    { code: 'SL', fare: 1000, seats: 180 }, { code: '3A', fare: 2400, seats: 72 }, { code: '2A', fare: 3500, seats: 48 }, { code: '1A', fare: 5800, seats: 24 },
  ] },
  { number: 'JJ1201', name: 'JoJo Central India Express', from: 'NDLS', to: 'BPL', departureMinute: 22 * 60, durationMinutes: 540, classes: [
    { code: 'SL', fare: 650, seats: 180 }, { code: '3A', fare: 1550, seats: 72 }, { code: '2A', fare: 2250, seats: 48 },
  ] },
  { number: 'JJ1301', name: 'JoJo Chennai–Bengaluru Intercity', from: 'SBC', to: 'MAS', departureMinute: 6 * 60 + 30, durationMinutes: 360, classes: [
    { code: '2S', fare: 180, seats: 120 }, { code: 'CC', fare: 480, seats: 80 }, { code: 'EC', fare: 800, seats: 36 },
  ] },
  { number: 'JJ1401', name: 'JoJo Hyderabad–Chennai Express', from: 'HYB', to: 'MAS', departureMinute: 19 * 60 + 30, durationMinutes: 690, classes: [
    { code: 'SL', fare: 420, seats: 180 }, { code: '3A', fare: 1050, seats: 72 }, { code: '2A', fare: 1550, seats: 48 },
  ] },
  { number: 'JJ1501', name: 'JoJo Nagpur Intercity', from: 'PUNE', to: 'NGP', departureMinute: 6 * 60, durationMinutes: 600, classes: [
    { code: '2S', fare: 320, seats: 120 }, { code: 'CC', fare: 820, seats: 80 }, { code: 'SL', fare: 550, seats: 180 }, { code: '3A', fare: 1350, seats: 72 },
  ] },
  { number: 'JJ1601', name: 'JoJo Aravalli Express', from: 'ADI', to: 'JP', departureMinute: 20 * 60, durationMinutes: 660, classes: [
    { code: 'SL', fare: 400, seats: 180 }, { code: '3A', fare: 950, seats: 72 }, { code: '2A', fare: 1400, seats: 48 },
  ] },
  { number: 'JJ1701', name: 'JoJo Bhopal–Nagpur Express', from: 'BPL', to: 'NGP', departureMinute: 8 * 60, durationMinutes: 420, classes: [
    { code: '2S', fare: 220, seats: 120 }, { code: 'CC', fare: 580, seats: 80 }, { code: 'SL', fare: 360, seats: 180 }, { code: '3A', fare: 900, seats: 72 },
  ] },
  { number: 'JJ1801', name: 'JoJo Kolkata–Bhopal Link Express', from: 'HWH', to: 'BPL', departureMinute: 11 * 60, durationMinutes: 1080, classes: [
    { code: 'SL', fare: 950, seats: 180 }, { code: '3A', fare: 2250, seats: 72 }, { code: '2A', fare: 3300, seats: 48 },
  ] },
];

function key(trainId: string, originId: string, destinationId: string, journeyDate: Date, classCode: string): string {
  return [trainId, originId, destinationId, journeyDate.toISOString().slice(0, 10), classCode].join('|');
}

async function main() {
  const stationIds = new Map<string, string>();
  for (const station of stations) {
    const row = await prisma.railStation.upsert({ where: { code: station.code }, create: station, update: station });
    stationIds.set(station.code, row.id);
  }

  const trainIds = new Map<string, string>();
  for (const item of trains) {
    const row = await prisma.train.upsert({ where: { number: item.number }, create: { number: item.number, name: item.name }, update: { name: item.name, active: true } });
    trainIds.set(item.number, row.id);
  }

  const start = new Date(`${indiaDateAtOffset(0)}T00:00:00.000Z`);
  const end = new Date(`${indiaDateAtOffset(TRAIN_SCHEDULE_HORIZON_DAYS)}T00:00:00.000Z`);
  const existingRows = await prisma.trainInventory.findMany({
    where: { trainId: { in: [...trainIds.values()] }, journeyDate: { gte: start, lte: end } },
    select: { id: true, trainId: true, originId: true, destinationId: true, journeyDate: true, classCode: true, totalSeats: true, availableSeats: true, departureAt: true, arrivalAt: true, farePerPassenger: true },
  });
  const existingByKey = new Map(existingRows.map(row => [key(row.trainId, row.originId, row.destinationId, row.journeyDate, row.classCode), row]));
  const missing: Prisma.TrainInventoryCreateManyInput[] = [];
  const changed: Array<{ id: string; data: Prisma.TrainInventoryUpdateInput }> = [];

  for (const item of trains) {
    const trainId = trainIds.get(item.number)!;
    const forwardOriginId = stationIds.get(item.from)!;
    const forwardDestinationId = stationIds.get(item.to)!;
    const directions = [
      { originId: forwardOriginId, destinationId: forwardDestinationId, departureMinute: item.departureMinute },
      { originId: forwardDestinationId, destinationId: forwardOriginId, departureMinute: (item.departureMinute + 12 * 60) % (24 * 60) },
    ];
    for (let day = 0; day <= TRAIN_SCHEDULE_HORIZON_DAYS; day += 1) {
      const journeyDate = new Date(`${indiaDateAtOffset(day)}T00:00:00.000Z`);
      for (const direction of directions) {
        for (const travelClass of item.classes) {
          const departureAt = indiaLocalDateTime(journeyDate.toISOString().slice(0, 10), direction.departureMinute);
          const arrivalAt = new Date(departureAt.getTime() + item.durationMinutes * 60_000);
          const inventoryKey = key(trainId, direction.originId, direction.destinationId, journeyDate, travelClass.code);
          const existing = existingByKey.get(inventoryKey);
          if (!existing) {
            missing.push({
              trainId, originId: direction.originId, destinationId: direction.destinationId, journeyDate,
              departureAt, arrivalAt, classCode: travelClass.code, totalSeats: travelClass.seats,
              availableSeats: travelClass.seats, farePerPassenger: travelClass.fare,
            });
            continue;
          }
          const reserved = Math.max(0, existing.totalSeats - existing.availableSeats);
          const availableSeats = Math.max(0, travelClass.seats - reserved);
          const farePerPassenger = new Prisma.Decimal(travelClass.fare);
          if (existing.totalSeats !== travelClass.seats || existing.availableSeats !== availableSeats
            || existing.departureAt.getTime() !== departureAt.getTime() || existing.arrivalAt.getTime() !== arrivalAt.getTime()
            || !existing.farePerPassenger.equals(farePerPassenger)) {
            changed.push({ id: existing.id, data: {
              departureAt, arrivalAt, totalSeats: travelClass.seats, availableSeats, farePerPassenger,
            } });
          }
        }
      }
    }
  }

  for (let offset = 0; offset < missing.length; offset += 1_000) {
    await prisma.trainInventory.createMany({ data: missing.slice(offset, offset + 1_000), skipDuplicates: true });
  }
  for (let offset = 0; offset < changed.length; offset += 100) {
    await prisma.$transaction(changed.slice(offset, offset + 100).map(({ id, data }) => prisma.trainInventory.update({ where: { id }, data })));
  }

  console.log(`Seeded ${stations.length} stations and ${trains.length * 2} directional synthetic train services, with class-specific fares/capacities for ${TRAIN_SCHEDULE_HORIZON_DAYS + 1} dates (${indiaDateAtOffset(0)} through ${indiaDateAtOffset(TRAIN_SCHEDULE_HORIZON_DAYS)}).`);
}

main().finally(() => prisma.$disconnect());
