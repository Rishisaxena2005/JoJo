export interface BookingReply {
    text: string;
    photoSvg?: string;
    inlineKeyboard?: Array<Array<{
        text: string;
        callback_data?: string;
    }>>;
}
export declare function handleBookingMessage(chatId: string, text: string, history: Array<{
    role: 'user' | 'assistant';
    content: string;
}>): Promise<string | BookingReply | null>;
export declare function handleBookingCallback(chatId: string, data: string): Promise<string | BookingReply | null>;
//# sourceMappingURL=bookingFlow.d.ts.map