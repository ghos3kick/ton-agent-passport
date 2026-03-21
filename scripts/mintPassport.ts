import { toNano, Address } from '@ton/core';
import { AgentRegistry } from '../build/AgentRegistry/AgentRegistry_AgentRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const registryAddress = Address.parse('EQ...'); // Replace with deployed registry address

    const registry = provider.open(AgentRegistry.fromAddress(registryAddress));

    await registry.send(
        provider.sender(),
        { value: toNano('0.2') },
        {
            $$type: 'MintPassport',
            queryId: BigInt(Date.now()),
            owner: provider.sender().address!,
            capabilities: 'translation,summarization',
            endpoint: 'https://myagent.example.com/api',
            metadataUrl: 'https://myagent.example.com/metadata.json',
        }
    );

    console.log('Minting passport...');

    const count = await registry.getGetAgentCount();
    console.log('Total agents:', count);
}
