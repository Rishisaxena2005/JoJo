export declare const TRAIN_SCHEDULE_HORIZON_DAYS = 120;
export declare function normalizeRailLocation(value: string): string;
export declare function indiaDateAtOffset(daysFromToday?: number): string;
export declare function isDateInsideTrainScheduleWindow(value: string): boolean;
export declare function indiaLocalDateTime(date: string, minuteOfDay: number): Date;
export type TrainAvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'INSUFFICIENT_FOR_PARTY' | 'SOLD_OUT';
export declare function trainAvailabilityStatus(availableSeats: number, requestedPassengers: number): TrainAvailabilityStatus;
//# sourceMappingURL=scheduleWindow.d.ts.map