import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';
import prisma from '../config/database';
import { indiaDateAtOffset, isDateInsideTrainScheduleWindow, normalizeRailLocation, trainAvailabilityStatus } from '../trains/scheduleWindow';

export const trainSearchSchema = z.object({
  fromStation: z.string().min(2).max(100), toStation: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), passengers: z.number().int().min(1).max(100).default(1),
});
export type TrainSearchResult = Awaited<ReturnType<typeof searchDemoTrains>>;

export async function searchDemoTrains(args: z.infer<typeof trainSearchSchema>) {
  const resolve = (value: string) => prisma.railStation.findFirst({ where: { OR: [
    { code: { equals: value, mode: 'insensitive' } }, { name: { equals: value, mode: 'insensitive' } }, { city: { equals: value, mode: 'insensitive' } }, { city: { equals: normalizeRailLocation(value), mode: 'insensitive' } },
  ] } });
  const [from, to] = await Promise.all([resolve(args.fromStation), resolve(args.toStation)]);
  if (!from || !to) return [];
  const dateText = args.date ?? indiaDateAtOffset();
  if (!isDateInsideTrainScheduleWindow(dateText)) return [];
  const rows = await prisma.trainInventory.findMany({
    where: { originId: from.id, destinationId: to.id, journeyDate: new Date(`${dateText}T00:00:00.000Z`), train: { active: true } },
    include: { train: true, origin: true, destination: true }, orderBy: { departureAt: 'asc' },
  });
  return rows.map(row => ({ inventoryId: row.id, train: row.train, origin: row.origin, destination: row.destination, journeyDate: row.journeyDate, departureAt: row.departureAt, arrivalAt: row.arrivalAt, durationMinutes: Math.round((row.arrivalAt.getTime() - row.departureAt.getTime()) / 60000), classCode: row.classCode, totalSeats: row.totalSeats, availableSeats: row.availableSeats, availabilityStatus: trainAvailabilityStatus(row.availableSeats, args.passengers), farePerPassenger: Number(row.farePerPassenger), demo: true }));
}

export const trainSearchTool: AgentTool<typeof trainSearchSchema, TrainSearchResult> = {
  name: 'train_search',
  description: 'Search JoJo synthetic demo train schedules between exact stations for a date and passenger count. Results are not live railway data.',
  schema: trainSearchSchema,
  sanitizeArguments: args => ({ fromStation: args.fromStation, toStation: args.toStation, date: args.date ?? 'today', passengers: args.passengers }),
  summarizeResult: rows => `Returned ${rows.length} synthetic demo train inventory options`,
  async execute(args, context) {
    if (context.signal.aborted) throw new Error('Tool execution aborted');
    return searchDemoTrains(args);
  },
};
