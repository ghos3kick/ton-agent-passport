import { WalletContractV4, internal, TonClient, SendMode } from '@ton/ton';
import { mnemonicToPrivateKey, KeyPair } from '@ton/crypto';
import { Cell } from '@ton/core';

let client: TonClient;
let wallet: WalletContractV4;
let keyPair: KeyPair;
let initialized = false;

export async function initDirectWallet() {
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) {
        throw new Error('MNEMONIC not set in .env');
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 24) {
        throw new Error(`MNEMONIC must be 24 words, got ${words.length}`);
    }

    keyPair = await mnemonicToPrivateKey(words);
    words.fill('');
    // Clear mnemonic from process environment
    process.env.MNEMONIC = '';

    wallet = WalletContractV4.create({
        publicKey: keyPair.publicKey,
        workchain: 0,
    });

    const isTestnet = process.env.NETWORK === 'testnet';
    const endpoint = isTestnet
        ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
        : 'https://toncenter.com/api/v2/jsonRPC';

    client = new TonClient({
        endpoint,
        apiKey: process.env.TONCENTER_API_KEY || undefined,
    });
    initialized = true;

    const addr = wallet.address.toString({ testOnly: isTestnet });
    console.log(`Direct wallet initialized: ${addr.slice(0, 8)}...${addr.slice(-4)}`);
}

export function getWalletAddress(): string {
    if (!initialized) throw new Error('Wallet not initialized');
    return wallet.address.toString({ testOnly: process.env.NETWORK === 'testnet' });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: unknown) {
            const errObj = err as Record<string, unknown> | undefined;
            const errResp = errObj?.response as Record<string, unknown> | undefined;
            const errMsg = err instanceof Error ? err.message : '';
            const is429 = errResp?.status === 429 || errObj?.status === 429 ||
                errMsg.includes('429');
            if (is429 && i < retries - 1) {
                console.log(`Rate limited, retrying in ${delay / 1000}s... (${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }
            throw err;
        }
    }
    throw new Error('Max retries exceeded');
}

// Transaction queue — ensures only one tx at a time (prevents seqno races)
let txLock: Promise<void> = Promise.resolve();

export async function sendTransaction(params: {
    to: string;
    value: bigint;
    body: Cell;
}): Promise<string> {
    if (!initialized) throw new Error('Wallet not initialized');

    // Queue: wait for previous transaction to complete
    const prevLock = txLock;
    let releaseLock: () => void;
    txLock = new Promise(resolve => { releaseLock = resolve; });

    await prevLock;

    try {
        const contract = client.open(wallet);
        const seqno = await withRetry(() => contract.getSeqno());

        await withRetry(() => contract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: params.to,
                    value: params.value,
                    body: params.body,
                    bounce: true,
                }),
            ],
        }));

        // Wait for seqno to increment (tx confirmation)
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const newSeqno = await contract.getSeqno();
            if (newSeqno > seqno) break;
        }

        return `seqno:${seqno}`;
    } finally {
        releaseLock!();
    }
}

export function isInitialized(): boolean {
    return initialized;
}
