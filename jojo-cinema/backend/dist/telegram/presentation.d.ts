export type TelegramButton = {
    text: string;
    callback_data: string;
};
export type TelegramPresentation = {
    type: 'showtimes' | 'movies' | 'cities' | 'cinemas';
    title?: string;
    subtitle?: string;
    items: Array<Record<string, any>>;
};
export type FormattedTelegramReply = {
    text: string;
    inlineKeyboard?: TelegramButton[][];
};
export declare function formatTelegramReply(reply: string, presentation?: TelegramPresentation): FormattedTelegramReply;
export declare function createTelegramPresentation(intent: string, selectedTool: string | null | undefined, evidence: unknown[]): TelegramPresentation | undefined;
//# sourceMappingURL=presentation.d.ts.map