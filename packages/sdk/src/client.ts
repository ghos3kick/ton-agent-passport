import { HttpClient, Api } from 'tonapi-sdk-js';
import {
    SDKConfig,
    AgentPassportData,
    AgentPassportMetadata,
    RegistryInfo,
    ListOptions,
    PassportNotFoundError,
    RegistryError,
} from './types';
import {
    fetchRegistryInfo,
    fetchTotalPassports,
    fetchPassportAddressByIndex,
} from './registry';
import {
    fetchPassportByAddress,
    fetchPassportMetadata,
} from './passport';
import {
    checkHasPassport,
    checkOwnership,
} from './verify';
import { isValidTonAddress } from './utils';

export class AgentPassportSDK {
    public readonly api: Api<unknown>;
    public readonly registryAddress: string;
    public readonly network: 'mainnet' | 'testnet';

    constructor(config: SDKConfig) {
        this.registryAddress = config.registryAddress;
        this.network = config.network ?? 'testnet';

        const baseUrl = config.baseUrl ||
                (this.network === 'mainnet'
                        ? 'https://tonapi.io'
                        : 'https://testnet.tonapi.io');

        const headers: Record<string, string> = {
            'Content-type': 'application/json',
        };
        if (config.tonapiKey) {
            headers['Authorization'] = `Bearer ${config.tonapiKey}`;
        }

        const httpClient = new HttpClient({
            baseUrl,
            baseApiParams: { headers },
        });

        this.api = new Api(httpClient);
    }

    // --- Registry (read) ---

    async getRegistryInfo(): Promise<RegistryInfo> {
        return fetchRegistryInfo(this.api, this.registryAddress);
    }

    async getPassportAddressByIndex(index: number): Promise<string> {
        return fetchPassportAddressByIndex(this.api, this.registryAddress, index);
    }

    async getTotalPassports(): Promise<number> {
        return fetchTotalPassports(this.api, this.registryAddress);
    }

    // --- Passport (read) ---

    async getPassport(passportAddress: string): Promise<AgentPassportData> {
        if (!isValidTonAddress(passportAddress)) {
            throw new Error('Invalid TON address');
        }
        return fetchPassportByAddress(this.api, passportAddress, this.registryAddress);
    }

    async getPassportByIndex(index: number): Promise<AgentPassportData> {
        const address = await this.getPassportAddressByIndex(index);
        return this.getPassport(address);
    }

    async getPassportMetadata(passportAddress: string): Promise<AgentPassportMetadata> {
        if (!isValidTonAddress(passportAddress)) {
            throw new Error('Invalid TON address');
        }
        return fetchPassportMetadata(this.api, passportAddress, this.registryAddress);
    }

    // --- Ownership ---

    async getPassportsByOwner(ownerAddress: string): Promise<AgentPassportData[]> {
        if (!isValidTonAddress(ownerAddress)) {
            throw new Error('Invalid TON address');
        }
        try {
            const result = await this.api.accounts.getAccountNftItems(ownerAddress, {
                collection: this.registryAddress,
                limit: 100,
            });

            const passports: AgentPassportData[] = [];
            for (const item of result.nft_items) {
                try {
                    const passport = await fetchPassportByAddress(this.api, item.address, this.registryAddress);
                    passports.push(passport);
                } catch {
                    // skip items that fail to parse
                }
            }
            return passports;
        } catch {
            return [];
        }
    }

    async hasPassport(ownerAddress: string): Promise<boolean> {
        if (!isValidTonAddress(ownerAddress)) {
            throw new Error('Invalid TON address');
        }
        return checkHasPassport(this.api, this.registryAddress, ownerAddress);
    }

    async verifyOwnership(ownerAddress: string, passportAddress: string): Promise<boolean> {
        if (!isValidTonAddress(ownerAddress)) {
            throw new Error('Invalid TON address');
        }
        if (!isValidTonAddress(passportAddress)) {
            throw new Error('Invalid TON address');
        }
        return checkOwnership(this.api, ownerAddress, passportAddress);
    }

    // --- Bulk / List ---

    async listPassports(options?: ListOptions): Promise<AgentPassportData[]> {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;

        try {
            const result = await this.api.nft.getItemsFromCollection(this.registryAddress, {
                limit,
                offset,
            });

            const passports: AgentPassportData[] = [];
            for (const item of result.nft_items) {
                try {
                    const passport = await fetchPassportByAddress(this.api, item.address, this.registryAddress);
                    passports.push(passport);
                } catch {
                    // skip items that fail to parse
                }
            }
            return passports;
        } catch {
            return [];
        }
    }

    async searchByCapability(capability: string): Promise<AgentPassportData[]> {
        const all = await this.listPassports({ limit: 1000 });
        const query = capability.toLowerCase();
        return all.filter((p) =>
            p.capabilities
                .toLowerCase()
                .split(',')
                .map((c) => c.trim())
                .includes(query)
        );
    }
}
