import { Api } from 'tonapi-sdk-js';

export async function checkHasPassport(
    api: Api<unknown>,
    registryAddress: string,
    ownerAddress: string,
): Promise<boolean> {
    try {
        const result = await api.accounts.getAccountNftItems(ownerAddress, {
            collection: registryAddress,
            limit: 1,
        });
        return result.nft_items.length > 0;
    } catch {
        return false;
    }
}

export async function checkOwnership(
    api: Api<unknown>,
    ownerAddress: string,
    passportAddress: string,
): Promise<boolean> {
    try {
        const nftItem = await api.nft.getNftItemByAddress(passportAddress);
        return nftItem.owner?.address === ownerAddress;
    } catch {
        return false;
    }
}
