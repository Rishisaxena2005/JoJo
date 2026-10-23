import { z } from 'zod';
export declare const conversationStateSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodLiteral<1>>;
    stage: z.ZodDefault<z.ZodEnum<["idle", "movie_search", "awaiting_city", "awaiting_movie", "awaiting_theatre", "awaiting_showtime", "awaiting_seats", "booking", "payment", "recovering"]>>;
    activeIntent: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    entities: z.ZodDefault<z.ZodObject<{
        movie: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        city: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theatre: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        date: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        time: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        seatCount: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        bookingId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        date: string | null;
        movie: string | null;
        city: string | null;
        theatre: string | null;
        bookingId: string | null;
        time: string | null;
        seatCount: number | null;
    }, {
        date?: string | null | undefined;
        movie?: string | null | undefined;
        city?: string | null | undefined;
        theatre?: string | null | undefined;
        bookingId?: string | null | undefined;
        time?: string | null | undefined;
        seatCount?: number | null | undefined;
    }>>;
    pendingQuestion: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        type: z.ZodString;
        prompt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        prompt: string;
    }, {
        type: string;
        prompt: string;
    }>>>;
    presentedOptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["movie", "city", "theatre", "showtime", "seat"]>;
    }, "strip", z.ZodTypeAny, {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }, {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }>, "many">>;
    lastTool: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    trainTask: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        stage: z.ZodDefault<z.ZodEnum<["route", "date", "passenger_count", "option", "passengers", "review", "payment"]>>;
        origin: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        destination: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        date: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        passengerCount: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        passengers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            age: z.ZodNumber;
            category: z.ZodEnum<["ADULT", "CHILD", "SENIOR"]>;
            gender: z.ZodDefault<z.ZodEnum<["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]>>;
            berthPreference: z.ZodDefault<z.ZodEnum<["LOWER", "MIDDLE", "UPPER", "SIDE_LOWER", "SIDE_UPPER", "NO_PREFERENCE"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
            berthPreference: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE";
        }, {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED" | undefined;
            berthPreference?: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE" | undefined;
        }>, "many">>;
        options: z.ZodDefault<z.ZodArray<z.ZodObject<{
            inventoryId: z.ZodString;
            trainName: z.ZodString;
            trainNumber: z.ZodString;
            originName: z.ZodString;
            destinationName: z.ZodString;
            departureAt: z.ZodString;
            arrivalAt: z.ZodString;
            durationMinutes: z.ZodNumber;
            classCode: z.ZodString;
            availableSeats: z.ZodNumber;
            farePerPassenger: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }, {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }>, "many">>;
        selectedInventoryId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        bookingId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        bookingReference: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        options: {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }[];
        date: string | null;
        bookingId: string | null;
        bookingReference: string | null;
        passengers: {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
            berthPreference: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE";
        }[];
        origin: string | null;
        destination: string | null;
        passengerCount: number | null;
        stage: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review";
        selectedInventoryId: string | null;
    }, {
        options?: {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }[] | undefined;
        date?: string | null | undefined;
        bookingId?: string | null | undefined;
        bookingReference?: string | null | undefined;
        passengers?: {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED" | undefined;
            berthPreference?: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE" | undefined;
        }[] | undefined;
        origin?: string | null | undefined;
        destination?: string | null | undefined;
        passengerCount?: number | null | undefined;
        stage?: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review" | undefined;
        selectedInventoryId?: string | null | undefined;
    }>>>;
    lastTrainBooking: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        bookingId: z.ZodString;
        reference: z.ZodString;
        inventoryId: z.ZodString;
        trainName: z.ZodString;
        trainNumber: z.ZodString;
        origin: z.ZodString;
        destination: z.ZodString;
        date: z.ZodString;
        classCode: z.ZodString;
        departureAt: z.ZodString;
        arrivalAt: z.ZodString;
        farePerPassenger: z.ZodNumber;
        passengerCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        bookingId: string;
        departureAt: string;
        arrivalAt: string;
        classCode: string;
        farePerPassenger: number;
        origin: string;
        destination: string;
        inventoryId: string;
        reference: string;
        passengerCount: number;
        trainName: string;
        trainNumber: string;
    }, {
        date: string;
        bookingId: string;
        departureAt: string;
        arrivalAt: string;
        classCode: string;
        farePerPassenger: number;
        origin: string;
        destination: string;
        inventoryId: string;
        reference: string;
        passengerCount: number;
        trainName: string;
        trainNumber: string;
    }>>>;
    updatedAt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    updatedAt: string | null;
    schemaVersion: 1;
    stage: "idle" | "booking" | "payment" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
    activeIntent: string | null;
    entities: {
        date: string | null;
        movie: string | null;
        city: string | null;
        theatre: string | null;
        bookingId: string | null;
        time: string | null;
        seatCount: number | null;
    };
    pendingQuestion: {
        type: string;
        prompt: string;
    } | null;
    presentedOptions: {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }[];
    lastTool: string | null;
    trainTask: {
        options: {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }[];
        date: string | null;
        bookingId: string | null;
        bookingReference: string | null;
        passengers: {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
            berthPreference: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE";
        }[];
        origin: string | null;
        destination: string | null;
        passengerCount: number | null;
        stage: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review";
        selectedInventoryId: string | null;
    } | null;
    lastTrainBooking: {
        date: string;
        bookingId: string;
        departureAt: string;
        arrivalAt: string;
        classCode: string;
        farePerPassenger: number;
        origin: string;
        destination: string;
        inventoryId: string;
        reference: string;
        passengerCount: number;
        trainName: string;
        trainNumber: string;
    } | null;
}, {
    updatedAt?: string | null | undefined;
    schemaVersion?: 1 | undefined;
    stage?: "idle" | "booking" | "payment" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering" | undefined;
    activeIntent?: string | null | undefined;
    entities?: {
        date?: string | null | undefined;
        movie?: string | null | undefined;
        city?: string | null | undefined;
        theatre?: string | null | undefined;
        bookingId?: string | null | undefined;
        time?: string | null | undefined;
        seatCount?: number | null | undefined;
    } | undefined;
    pendingQuestion?: {
        type: string;
        prompt: string;
    } | null | undefined;
    presentedOptions?: {
        type: "movie" | "city" | "theatre" | "seat" | "showtime";
        id: string;
        label: string;
    }[] | undefined;
    lastTool?: string | null | undefined;
    trainTask?: {
        options?: {
            durationMinutes: number;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            availableSeats: number;
            farePerPassenger: number;
            inventoryId: string;
            trainName: string;
            trainNumber: string;
            originName: string;
            destinationName: string;
        }[] | undefined;
        date?: string | null | undefined;
        bookingId?: string | null | undefined;
        bookingReference?: string | null | undefined;
        passengers?: {
            name: string;
            age: number;
            category: "ADULT" | "CHILD" | "SENIOR";
            gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED" | undefined;
            berthPreference?: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE" | undefined;
        }[] | undefined;
        origin?: string | null | undefined;
        destination?: string | null | undefined;
        passengerCount?: number | null | undefined;
        stage?: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review" | undefined;
        selectedInventoryId?: string | null | undefined;
    } | null | undefined;
    lastTrainBooking?: {
        date: string;
        bookingId: string;
        departureAt: string;
        arrivalAt: string;
        classCode: string;
        farePerPassenger: number;
        origin: string;
        destination: string;
        inventoryId: string;
        reference: string;
        passengerCount: number;
        trainName: string;
        trainNumber: string;
    } | null | undefined;
}>;
export type ConversationState = z.infer<typeof conversationStateSchema>;
export type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};
export declare function loadTelegramConversation(chatId: string, userId: string, updateId: number): Promise<{
    duplicate: boolean;
    history: ConversationMessage[];
    state: {
        updatedAt: string | null;
        schemaVersion: 1;
        stage: "idle" | "booking" | "payment" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
        activeIntent: string | null;
        entities: {
            date: string | null;
            movie: string | null;
            city: string | null;
            theatre: string | null;
            bookingId: string | null;
            time: string | null;
            seatCount: number | null;
        };
        pendingQuestion: {
            type: string;
            prompt: string;
        } | null;
        presentedOptions: {
            type: "movie" | "city" | "theatre" | "seat" | "showtime";
            id: string;
            label: string;
        }[];
        lastTool: string | null;
        trainTask: {
            options: {
                durationMinutes: number;
                departureAt: string;
                arrivalAt: string;
                classCode: string;
                availableSeats: number;
                farePerPassenger: number;
                inventoryId: string;
                trainName: string;
                trainNumber: string;
                originName: string;
                destinationName: string;
            }[];
            date: string | null;
            bookingId: string | null;
            bookingReference: string | null;
            passengers: {
                name: string;
                age: number;
                category: "ADULT" | "CHILD" | "SENIOR";
                gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
                berthPreference: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE";
            }[];
            origin: string | null;
            destination: string | null;
            passengerCount: number | null;
            stage: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review";
            selectedInventoryId: string | null;
        } | null;
        lastTrainBooking: {
            date: string;
            bookingId: string;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            farePerPassenger: number;
            origin: string;
            destination: string;
            inventoryId: string;
            reference: string;
            passengerCount: number;
            trainName: string;
            trainNumber: string;
        } | null;
    };
    version?: undefined;
} | {
    duplicate: boolean;
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
    state: {
        updatedAt: string | null;
        schemaVersion: 1;
        stage: "idle" | "booking" | "payment" | "movie_search" | "awaiting_city" | "awaiting_movie" | "awaiting_theatre" | "awaiting_showtime" | "awaiting_seats" | "recovering";
        activeIntent: string | null;
        entities: {
            date: string | null;
            movie: string | null;
            city: string | null;
            theatre: string | null;
            bookingId: string | null;
            time: string | null;
            seatCount: number | null;
        };
        pendingQuestion: {
            type: string;
            prompt: string;
        } | null;
        presentedOptions: {
            type: "movie" | "city" | "theatre" | "seat" | "showtime";
            id: string;
            label: string;
        }[];
        lastTool: string | null;
        trainTask: {
            options: {
                durationMinutes: number;
                departureAt: string;
                arrivalAt: string;
                classCode: string;
                availableSeats: number;
                farePerPassenger: number;
                inventoryId: string;
                trainName: string;
                trainNumber: string;
                originName: string;
                destinationName: string;
            }[];
            date: string | null;
            bookingId: string | null;
            bookingReference: string | null;
            passengers: {
                name: string;
                age: number;
                category: "ADULT" | "CHILD" | "SENIOR";
                gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
                berthPreference: "LOWER" | "MIDDLE" | "UPPER" | "SIDE_LOWER" | "SIDE_UPPER" | "NO_PREFERENCE";
            }[];
            origin: string | null;
            destination: string | null;
            passengerCount: number | null;
            stage: "date" | "payment" | "route" | "passengers" | "passenger_count" | "option" | "review";
            selectedInventoryId: string | null;
        } | null;
        lastTrainBooking: {
            date: string;
            bookingId: string;
            departureAt: string;
            arrivalAt: string;
            classCode: string;
            farePerPassenger: number;
            origin: string;
            destination: string;
            inventoryId: string;
            reference: string;
            passengerCount: number;
            trainName: string;
            trainNumber: string;
        } | null;
    };
    version: number;
}>;
export declare function saveTelegramConversation(input: {
    chatId: string;
    userId: string;
    updateId: number;
    history: ConversationMessage[];
    state: ConversationState;
}): Promise<void>;
export declare function stateFromTurn(state: ConversationState, userText: string, reply: string): ConversationState;
//# sourceMappingURL=conversationState.d.ts.map