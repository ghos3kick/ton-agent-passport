import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
    walletAddress?: string;
}

export type BaseContext = Context & SessionFlavor<SessionData>;

export type BotContext = ConversationFlavor<BaseContext>;
