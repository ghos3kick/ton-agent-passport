import { Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import { BaseContext } from '../context';
import { isValidTonAddress } from '@agent-passport/sdk';
import { buildMintBody, sendMintTransaction } from '../services/mint';
import { config } from '../config';
import { Address } from '@ton/core';

const MAX_FIELD_LENGTH = 256;

function isValidUrl(s: string): boolean {
    try { new URL(s); return true; } catch { return false; }
}

export async function mintConversation(
    conversation: Conversation<BaseContext, BaseContext>,
    ctx: BaseContext,
) {
    await ctx.reply('\ud83d\udd11 <b>Admin Mint Flow</b>\n\nLet\'s mint a new Agent Passport.', {
        parse_mode: 'HTML',
    });

    // Step 1: Owner address
    await ctx.reply('Enter the owner wallet address (who will receive the SBT):');
    let ownerAddress = '';
    while (true) {
        const ownerCtx = await conversation.waitFor('message:text');
        const input = ownerCtx.message.text.trim();
        if (isValidTonAddress(input)) {
            ownerAddress = input;
            break;
        }
        await ownerCtx.reply('\u274c Invalid TON address. Please try again:');
    }

    // Step 2: Endpoint (URL validation)
    await ctx.reply('Enter the agent endpoint URL:');
    let endpoint = '';
    while (true) {
        const endpointCtx = await conversation.waitFor('message:text');
        const input = endpointCtx.message.text.trim();
        if (!input) { await endpointCtx.reply('\u26a0\ufe0f Field cannot be empty. Try again:'); continue; }
        if (input.length > MAX_FIELD_LENGTH) { await endpointCtx.reply(`\u26a0\ufe0f Too long (max ${MAX_FIELD_LENGTH} chars). Try again:`); continue; }
        if (!isValidUrl(input)) { await endpointCtx.reply('\u26a0\ufe0f Invalid URL format. Try again:'); continue; }
        endpoint = input;
        break;
    }

    // Step 3: Capabilities (length validation)
    await ctx.reply('Enter capabilities (comma-separated, e.g.: trading, analysis, alerts):');
    let capabilities = '';
    while (true) {
        const capsCtx = await conversation.waitFor('message:text');
        const input = capsCtx.message.text.trim();
        if (!input) { await capsCtx.reply('\u26a0\ufe0f Field cannot be empty. Try again:'); continue; }
        if (input.length > MAX_FIELD_LENGTH) { await capsCtx.reply(`\u26a0\ufe0f Too long (max ${MAX_FIELD_LENGTH} chars). Try again:`); continue; }
        capabilities = input;
        break;
    }

    // Step 4: Metadata URL (URL validation)
    await ctx.reply('Enter metadata URL (JSON, TEP-64 format):');
    let metadataUrl = '';
    while (true) {
        const metaCtx = await conversation.waitFor('message:text');
        const input = metaCtx.message.text.trim();
        if (!input) { await metaCtx.reply('\u26a0\ufe0f Field cannot be empty. Try again:'); continue; }
        if (input.length > MAX_FIELD_LENGTH) { await metaCtx.reply(`\u26a0\ufe0f Too long (max ${MAX_FIELD_LENGTH} chars). Try again:`); continue; }
        if (!isValidUrl(input)) { await metaCtx.reply('\u26a0\ufe0f Invalid URL format. Try again:'); continue; }
        metadataUrl = input;
        break;
    }

    // Step 5: Confirmation
    const keyboard = new InlineKeyboard()
        .text('\u2705 Confirm', 'mint_confirm')
        .text('\u274c Cancel', 'mint_cancel');

    const owner = Address.parse(ownerAddress);
    await ctx.reply(
        `\ud83d\udccb <b>Mint Summary</b>\n\n` +
        `\ud83d\udc64 Owner: <code>${owner.toString({ bounceable: false })}</code>\n` +
        `\ud83c\udf10 Endpoint: ${endpoint}\n` +
        `\u26a1 Capabilities: ${capabilities}\n` +
        `\ud83d\udcc4 Metadata: ${metadataUrl}\n\n` +
        `Confirm mint?`,
        { parse_mode: 'HTML', reply_markup: keyboard },
    );

    const cbCtx = await conversation.waitForCallbackQuery(['mint_confirm', 'mint_cancel']);
    if (cbCtx.callbackQuery.data === 'mint_cancel') {
        await cbCtx.answerCallbackQuery('Cancelled');
        await cbCtx.editMessageText('\u274c Mint cancelled.');
        return;
    }

    await cbCtx.answerCallbackQuery('Processing...');
    await cbCtx.editMessageText('\u23f3 Sending mint transaction...');

    try {
        const mintBody = buildMintBody({ queryId: BigInt(Date.now()), owner, capabilities, endpoint, metadataUrl });
        const result = await sendMintTransaction(config.registryAddress, mintBody);

        await ctx.reply(
            `\u2705 <b>Mint transaction sent!</b>\n\n` +
            `TX: <code>${result}</code>\n` +
            `Transaction should appear shortly.`,
            { parse_mode: 'HTML' },
        );
    } catch (error: unknown) {
        console.error('Mint conversation error:', error instanceof Error ? error.message : 'unknown');
        await ctx.reply('\u274c Mint failed. Please try again later or contact the admin.');
    }
}
