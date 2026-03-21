import { AgentPassportSDK } from '../src/client';
import { PassportNotFoundError, RegistryError } from '../src/types';
import { normalizeAddress, isValidTonAddress, shortenAddress } from '../src/utils';

// --- Mock tonapi-sdk-js ---
const mockExecGetMethod = jest.fn();
const mockGetNftItemByAddress = jest.fn();
const mockGetAccountNftItems = jest.fn();
const mockGetItemsFromCollection = jest.fn();

jest.mock('tonapi-sdk-js', () => ({
    HttpClient: jest.fn().mockImplementation(() => ({})),
    Api: jest.fn().mockImplementation(() => ({
        blockchain: {
            execGetMethodForBlockchainAccount: mockExecGetMethod,
        },
        nft: {
            getNftItemByAddress: mockGetNftItemByAddress,
            getItemsFromCollection: mockGetItemsFromCollection,
        },
        accounts: {
            getAccountNftItems: mockGetAccountNftItems,
        },
    })),
}));

const REGISTRY = '0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const PASSPORT_ADDR = '0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OWNER_ADDR = '0:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function makeNftItem(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        address: PASSPORT_ADDR,
        index: 0,
        owner: { address: OWNER_ADDR, name: '', is_scam: false, is_wallet: true },
        collection: { address: REGISTRY, name: 'Agent Registry', description: '' },
        verified: true,
        metadata: {},
        approved_by: [],
        trust: 'whitelist',
        ...overrides,
    };
}

function makePassportDataResult(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        success: true,
        exit_code: 0,
        stack: [],
        decoded: {
            owner: OWNER_ADDR,
            capabilities: 'translation,summarization',
            endpoint: 'https://agent.example.com/api',
            metadataUrl: 'https://agent.example.com/metadata.json',
            createdAt: 1710000000,
            txCount: 42,
            revokedAt: 0,
            ...overrides,
        },
    };
}

describe('AgentPassportSDK', () => {
    let sdk: AgentPassportSDK;

    beforeEach(() => {
        jest.clearAllMocks();
        sdk = new AgentPassportSDK({ registryAddress: REGISTRY, network: 'testnet' });
    });

    describe('getRegistryInfo', () => {
        it('should return registry info', async () => {
            mockExecGetMethod.mockResolvedValue({
                success: true,
                exit_code: 0,
                stack: [
                    { type: 'num', num: '5' },
                    { type: 'cell', cell: 'content_cell' },
                    { type: 'slice', slice: OWNER_ADDR },
                ],
            });

            const info = await sdk.getRegistryInfo();

            expect(info.address).toBe(REGISTRY);
            expect(info.ownerAddress).toBe(OWNER_ADDR);
            expect(info.nextItemIndex).toBe(5);
        });

        it('should throw RegistryError on failure', async () => {
            mockExecGetMethod.mockResolvedValue({ success: false, exit_code: 1, stack: [] });

            await expect(sdk.getRegistryInfo()).rejects.toThrow(RegistryError);
        });
    });

    describe('getTotalPassports', () => {
        it('should return count', async () => {
            mockExecGetMethod.mockResolvedValue({
                success: true,
                exit_code: 0,
                stack: [{ type: 'num', num: '10' }],
            });

            const count = await sdk.getTotalPassports();
            expect(count).toBe(10);
        });
    });

    describe('getPassportAddressByIndex', () => {
        it('should return address', async () => {
            mockExecGetMethod.mockResolvedValue({
                success: true,
                exit_code: 0,
                stack: [{ type: 'slice', slice: PASSPORT_ADDR }],
            });

            const addr = await sdk.getPassportAddressByIndex(0);
            expect(addr).toBe(PASSPORT_ADDR);
        });
    });

    describe('getPassport', () => {
        it('should return full passport data using decoded field', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult())  // get_passport_data
                .mockResolvedValueOnce({                           // get_authority_address
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passport = await sdk.getPassport(PASSPORT_ADDR);

            expect(passport.address).toBe(PASSPORT_ADDR);
            expect(passport.index).toBe(0);
            expect(passport.ownerAddress).toBe(OWNER_ADDR);
            expect(passport.collectionAddress).toBe(REGISTRY);
            expect(passport.capabilities).toBe('translation,summarization');
            expect(passport.endpoint).toBe('https://agent.example.com/api');
            expect(passport.txCount).toBe(42);
            expect(passport.createdAt).toBe(1710000000);
            expect(passport.revokedAt).toBe(0);
            expect(passport.isActive).toBe(true);
            expect(passport.authorityAddress).toBe(REGISTRY);
        });

        it('should handle revoked passport', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ revokedAt: 1710100000 }))
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passport = await sdk.getPassport(PASSPORT_ADDR);

            expect(passport.revokedAt).toBe(1710100000);
            expect(passport.isActive).toBe(false);
        });

        it('should throw PassportNotFoundError on 404', async () => {
            mockGetNftItemByAddress.mockRejectedValue(new Error('Not found'));

            await expect(sdk.getPassport(PASSPORT_ADDR)).rejects.toThrow(PassportNotFoundError);
        });
    });

    describe('getPassportsByOwner', () => {
        it('should return passports for owner', async () => {
            mockGetAccountNftItems.mockResolvedValue({
                nft_items: [makeNftItem()],
            });
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult())
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passports = await sdk.getPassportsByOwner(OWNER_ADDR);

            expect(passports).toHaveLength(1);
            expect(passports[0].ownerAddress).toBe(OWNER_ADDR);
        });

        it('should return empty array when owner has no passports', async () => {
            mockGetAccountNftItems.mockResolvedValue({ nft_items: [] });

            const passports = await sdk.getPassportsByOwner(OWNER_ADDR);
            expect(passports).toHaveLength(0);
        });

        it('should return empty array on network error', async () => {
            mockGetAccountNftItems.mockRejectedValue(new Error('Network error'));

            const passports = await sdk.getPassportsByOwner(OWNER_ADDR);
            expect(passports).toHaveLength(0);
        });
    });

    describe('hasPassport', () => {
        it('should return true when owner has passport', async () => {
            mockGetAccountNftItems.mockResolvedValue({
                nft_items: [makeNftItem()],
            });

            const result = await sdk.hasPassport(OWNER_ADDR);
            expect(result).toBe(true);
        });

        it('should return false when owner has no passport', async () => {
            mockGetAccountNftItems.mockResolvedValue({ nft_items: [] });

            const result = await sdk.hasPassport(OWNER_ADDR);
            expect(result).toBe(false);
        });
    });

    describe('verifyOwnership', () => {
        it('should return true when owner matches', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());

            const result = await sdk.verifyOwnership(OWNER_ADDR, PASSPORT_ADDR);
            expect(result).toBe(true);
        });

        it('should return false when owner does not match', async () => {
            mockGetNftItemByAddress.mockResolvedValue(
                makeNftItem({ owner: { address: '0:cccc', name: '', is_scam: false, is_wallet: true } }),
            );

            const result = await sdk.verifyOwnership(OWNER_ADDR, PASSPORT_ADDR);
            expect(result).toBe(false);
        });
    });

    describe('listPassports', () => {
        it('should return list of passports', async () => {
            mockGetItemsFromCollection.mockResolvedValue({
                nft_items: [makeNftItem()],
            });
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult())
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passports = await sdk.listPassports({ limit: 10, offset: 0 });

            expect(passports).toHaveLength(1);
        });
    });

    describe('searchByCapability', () => {
        it('should filter by capability', async () => {
            mockGetItemsFromCollection.mockResolvedValue({
                nft_items: [makeNftItem(), makeNftItem({ address: '0:dddd', index: 1 })],
            });

            // First passport: has translation
            mockGetNftItemByAddress.mockResolvedValueOnce(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ capabilities: 'translation,summarization' }))
                .mockResolvedValueOnce({ success: true, exit_code: 0, stack: [{ type: 'slice', slice: REGISTRY }] });

            // Second passport: only coding
            mockGetNftItemByAddress.mockResolvedValueOnce(makeNftItem({ address: '0:dddd', index: 1 }));
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ capabilities: 'coding' }))
                .mockResolvedValueOnce({ success: true, exit_code: 0, stack: [{ type: 'slice', slice: REGISTRY }] });

            const results = await sdk.searchByCapability('translation');

            expect(results).toHaveLength(1);
            expect(results[0].capabilities).toContain('translation');
        });
    });

    describe('getPassport — stack fallback parsing', () => {
        it('should parse passport data from stack when decoded is absent', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [
                        { type: 'slice', slice: OWNER_ADDR },
                        { type: 'cell', cell: 'translation,summarization' },
                        { type: 'cell', cell: 'https://agent.example.com/api' },
                        { type: 'cell', cell: 'https://agent.example.com/metadata.json' },
                        { type: 'num', num: '1710000000' },
                        { type: 'num', num: '42' },
                        { type: 'num', num: '0' },
                    ],
                    // no decoded field
                })
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passport = await sdk.getPassport(PASSPORT_ADDR);

            expect(passport.ownerAddress).toBe(OWNER_ADDR);
            expect(passport.capabilities).toBe('translation,summarization');
            expect(passport.endpoint).toBe('https://agent.example.com/api');
            expect(passport.txCount).toBe(42);
            expect(passport.isActive).toBe(true);
        });

        it('should handle empty stack gracefully', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [],
                    // no decoded
                })
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            const passport = await sdk.getPassport(PASSPORT_ADDR);

            expect(passport.address).toBe(PASSPORT_ADDR);
            expect(passport.capabilities).toBe('');
            expect(passport.txCount).toBe(0);
        });
    });

    describe('getPassport — error cases', () => {
        it('should throw PassportNotFoundError when get_passport_data fails', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod.mockResolvedValueOnce({
                success: false,
                exit_code: 1,
                stack: [],
            });

            await expect(sdk.getPassport(PASSPORT_ADDR)).rejects.toThrow(PassportNotFoundError);
        });

        it('should throw PassportNotFoundError when SBT is from wrong registry', async () => {
            const wrongRegistry = '0:9999999999999999999999999999999999999999999999999999999999999999';
            mockGetNftItemByAddress.mockResolvedValue(
                makeNftItem({ collection: { address: wrongRegistry, name: '', description: '' } }),
            );

            await expect(sdk.getPassport(PASSPORT_ADDR)).rejects.toThrow(PassportNotFoundError);
        });
    });

    describe('getPassportMetadata — edge cases', () => {
        it('should throw when metadata URL is missing', async () => {
            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ metadataUrl: '' }))
                .mockResolvedValueOnce({
                    success: true,
                    exit_code: 0,
                    stack: [{ type: 'slice', slice: REGISTRY }],
                });

            await expect(sdk.getPassportMetadata(PASSPORT_ADDR)).rejects.toThrow('no metadata URL');
        });
    });

    describe('verifyOwnership — edge cases', () => {
        it('should return false when NFT lookup fails', async () => {
            mockGetNftItemByAddress.mockRejectedValue(new Error('Network error'));

            const result = await sdk.verifyOwnership(OWNER_ADDR, PASSPORT_ADDR);
            expect(result).toBe(false);
        });
    });

    describe('hasPassport — edge cases', () => {
        it('should return false on API error', async () => {
            mockGetAccountNftItems.mockRejectedValue(new Error('Timeout'));

            const result = await sdk.hasPassport(OWNER_ADDR);
            expect(result).toBe(false);
        });
    });

    describe('listPassports — edge cases', () => {
        it('should return empty array on API error', async () => {
            mockGetItemsFromCollection.mockRejectedValue(new Error('500'));

            const result = await sdk.listPassports();
            expect(result).toEqual([]);
        });

        it('should skip items that fail to parse', async () => {
            mockGetItemsFromCollection.mockResolvedValue({
                nft_items: [makeNftItem(), makeNftItem({ address: '0:bad' })],
            });

            // First item parses OK
            mockGetNftItemByAddress.mockResolvedValueOnce(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult())
                .mockResolvedValueOnce({ success: true, exit_code: 0, stack: [{ type: 'slice', slice: REGISTRY }] });

            // Second item throws
            mockGetNftItemByAddress.mockRejectedValueOnce(new Error('Not found'));

            const result = await sdk.listPassports();
            expect(result).toHaveLength(1);
        });
    });

    describe('searchByCapability — edge cases', () => {
        it('should return empty array when no passports match', async () => {
            mockGetItemsFromCollection.mockResolvedValue({
                nft_items: [makeNftItem()],
            });

            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ capabilities: 'coding' }))
                .mockResolvedValueOnce({ success: true, exit_code: 0, stack: [{ type: 'slice', slice: REGISTRY }] });

            const results = await sdk.searchByCapability('translation');
            expect(results).toHaveLength(0);
        });

        it('should be case-insensitive', async () => {
            mockGetItemsFromCollection.mockResolvedValue({
                nft_items: [makeNftItem()],
            });

            mockGetNftItemByAddress.mockResolvedValue(makeNftItem());
            mockExecGetMethod
                .mockResolvedValueOnce(makePassportDataResult({ capabilities: 'Translation,Summarization' }))
                .mockResolvedValueOnce({ success: true, exit_code: 0, stack: [{ type: 'slice', slice: REGISTRY }] });

            const results = await sdk.searchByCapability('translation');
            expect(results).toHaveLength(1);
        });
    });
});

describe('Utils', () => {
    describe('isValidTonAddress', () => {
        it('should validate correct addresses', () => {
            expect(isValidTonAddress('EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA')).toBe(true);
        });

        it('should reject invalid addresses', () => {
            expect(isValidTonAddress('not-an-address')).toBe(false);
            expect(isValidTonAddress('')).toBe(false);
        });
    });

    describe('shortenAddress', () => {
        it('should shorten long addresses', () => {
            const addr = 'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA';
            const short = shortenAddress(addr);
            expect(short).toMatch(/^EQBy.*wiuA$/);
            expect(short.length).toBeLessThan(addr.length);
        });

        it('should not shorten short strings', () => {
            expect(shortenAddress('abc')).toBe('abc');
        });
    });
});
