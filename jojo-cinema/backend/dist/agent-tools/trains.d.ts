import { z } from 'zod';
import type { AgentTool } from '../agent-runtime/tool';
export declare const trainSearchSchema: z.ZodObject<{
    fromStation: z.ZodString;
    toStation: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
    passengers: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    fromStation: string;
    toStation: string;
    passengers: number;
    date?: string | undefined;
}, {
    fromStation: string;
    toStation: string;
    date?: string | undefined;
    passengers?: number | undefined;
}>;
export type TrainSearchResult = Awaited<ReturnType<typeof searchDemoTrains>>;
export declare function searchDemoTrains(args: z.infer<typeof trainSearchSchema>): Promise<{
    inventoryId: string;
    train: {
        number: string;
        id: string;
        name: string;
        createdAt: Date;
        active: boolean;
    };
    origin: {
        code: string;
        city: string;
        id: string;
        name: string;
        state: string;
        createdAt: Date;
    };
    destination: {
        code: string;
        city: string;
        id: string;
        name: string;
        state: string;
        createdAt: Date;
    };
    journeyDate: Date;
    departureAt: Date;
    arrivalAt: Date;
    durationMinutes: number;
    classCode: string;
    totalSeats: number;
    availableSeats: number;
    availabilityStatus: import("../trains/scheduleWindow").TrainAvailabilityStatus;
    farePerPassenger: number;
    demo: boolean;
}[]>;
export declare const trainSearchTool: AgentTool<typeof trainSearchSchema, TrainSearchResult>;
//# sourceMappingURL=trains.d.ts.map