export interface AgentPassportData {
    address: string;
    index: number;
    ownerAddress: string;
    collectionAddress: string;
    capabilities: string;
    endpoint: string;
    metadataUrl: string;
    txCount: number;
    createdAt: number;
    authorityAddress: string;
    revokedAt: number;
    isActive: boolean;
}

export interface AgentPassportMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
}

export interface RegistryInfo {
    address: string;
    ownerAddress: string;
    nextItemIndex: number;
}

export interface MintParams {
    ownerAddress: string;
    capabilities: string;
    endpoint: string;
    metadataUrl: string;
}

export interface SDKConfig {
    registryAddress: string;
    tonapiKey?: string;
    baseUrl?: string;
    network?: 'mainnet' | 'testnet';
}

export interface ListOptions {
    limit?: number;
    offset?: number;
}

export class PassportNotFoundError extends Error {
    constructor(address: string) {
        super(`Passport not found: ${address}`);
        this.name = 'PassportNotFoundError';
    }
}

export class PassportRevokedError extends Error {
    constructor(address: string) {
        super(`Passport is revoked: ${address}`);
        this.name = 'PassportRevokedError';
    }
}

export class RegistryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RegistryError';
    }
}
