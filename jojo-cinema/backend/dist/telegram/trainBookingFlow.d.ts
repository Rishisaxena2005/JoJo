import type { ConversationState } from './conversationState';
type TrainKeyboard = string[][];
export type TrainFlowResult = {
    handled: boolean;
    reply?: string;
    state: ConversationState;
    keyboard?: TrainKeyboard;
};
export declare function handleTrainBookingMessage(chatId: string, userId: string, text: string, state: ConversationState): Promise<TrainFlowResult>;
export {};
//# sourceMappingURL=trainBookingFlow.d.ts.map