"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainSearchTool = exports.trainSearchSchema = void 0;
exports.searchDemoTrains = searchDemoTrains;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const scheduleWindow_1 = require("../trains/scheduleWindow");
exports.trainSearchSchema = zod_1.z.object({
    fromStation: zod_1.z.string().min(2).max(100), toStation: zod_1.z.string().min(2).max(100),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), passengers: zod_1.z.number().int().min(1).max(100).default(1),
});
async function searchDemoTrains(args) {
    const resolve = (value) => database_1.default.railStation.findFirst({ where: { OR: [
                { code: { equals: value, mode: 'insensitive' } }, { name: { equals: value, mode: 'insensitive' } }, { city: { equals: value, mode: 'insensitive' } }, { city: { equals: (0, scheduleWindow_1.normalizeRailLocation)(value), mode: 'insensitive' } },
            ] } });
    const [from, to] = await Promise.all([resolve(args.fromStation), resolve(args.toStation)]);
    if (!from || !to)
        return [];
    const dateText = args.date ?? (0, scheduleWindow_1.indiaDateAtOffset)();
    if (!(0, scheduleWindow_1.isDateInsideTrainScheduleWindow)(dateText))
        return [];
    const rows = await database_1.default.trainInventory.findMany({
        where: { originId: from.id, destinationId: to.id, journeyDate: new Date(`${dateText}T00:00:00.000Z`), train: { active: true } },
        include: { train: true, origin: true, destination: true }, orderBy: { departureAt: 'asc' },
    });
    return rows.map(row => ({ inventoryId: row.id, train: row.train, origin: row.origin, destination: row.destination, journeyDate: row.journeyDate, departureAt: row.departureAt, arrivalAt: row.arrivalAt, durationMinutes: Math.round((row.arrivalAt.getTime() - row.departureAt.getTime()) / 60000), classCode: row.classCode, totalSeats: row.totalSeats, availableSeats: row.availableSeats, availabilityStatus: (0, scheduleWindow_1.trainAvailabilityStatus)(row.availableSeats, args.passengers), farePerPassenger: Number(row.farePerPassenger), demo: true }));
}
exports.trainSearchTool = {
    name: 'train_search',
    description: 'Search JoJo synthetic demo train schedules between exact stations for a date and passenger count. Results are not live railway data.',
    schema: exports.trainSearchSchema,
    sanitizeArguments: args => ({ fromStation: args.fromStation, toStation: args.toStation, date: args.date ?? 'today', passengers: args.passengers }),
    summarizeResult: rows => `Returned ${rows.length} synthetic demo train inventory options`,
    async execute(args, context) {
        if (context.signal.aborted)
            throw new Error('Tool execution aborted');
        return searchDemoTrains(args);
    },
};
//# sourceMappingURL=trains.js.map