"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRAIN_SCHEDULE_HORIZON_DAYS = void 0;
exports.normalizeRailLocation = normalizeRailLocation;
exports.indiaDateAtOffset = indiaDateAtOffset;
exports.isDateInsideTrainScheduleWindow = isDateInsideTrainScheduleWindow;
exports.indiaLocalDateTime = indiaLocalDateTime;
exports.trainAvailabilityStatus = trainAvailabilityStatus;
exports.TRAIN_SCHEDULE_HORIZON_DAYS = 120;
const INDIA_OFFSET_MINUTES = 5 * 60 + 30;
const LOCATION_ALIASES = {
    bangalore: 'bengaluru', bombay: 'mumbai', madras: 'chennai', calcutta: 'kolkata',
};
function normalizeRailLocation(value) {
    const normalized = value.trim().toLowerCase();
    return LOCATION_ALIASES[normalized] ?? normalized;
}
function indiaDateAtOffset(daysFromToday = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type) => parts.find(item => item.type === type)?.value ?? '';
    const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + daysFromToday);
    return date.toISOString().slice(0, 10);
}
function isDateInsideTrainScheduleWindow(value) {
    const requested = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(requested.getTime()) || requested.toISOString().slice(0, 10) !== value)
        return false;
    const first = new Date(`${indiaDateAtOffset(0)}T00:00:00.000Z`);
    const last = new Date(`${indiaDateAtOffset(exports.TRAIN_SCHEDULE_HORIZON_DAYS)}T00:00:00.000Z`);
    return requested >= first && requested <= last;
}
function indiaLocalDateTime(date, minuteOfDay) {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCMinutes(minuteOfDay - INDIA_OFFSET_MINUTES);
    return value;
}
function trainAvailabilityStatus(availableSeats, requestedPassengers) {
    if (availableSeats <= 0)
        return 'SOLD_OUT';
    if (availableSeats < requestedPassengers)
        return 'INSUFFICIENT_FOR_PARTY';
    if (availableSeats <= 10)
        return 'LIMITED';
    return 'AVAILABLE';
}
//# sourceMappingURL=scheduleWindow.js.map