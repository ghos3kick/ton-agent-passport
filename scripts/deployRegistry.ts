import { toNano, beginCell } from '@ton/core';
import { AgentRegistry } from '../build/AgentRegistry/AgentRegistry_AgentRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const collectionContent = beginCell()
        .storeUint(1, 8) // off-chain tag
        .storeStringTail('https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/collection.json')
        .endCell();

    const registry = provider.open(
        await AgentRegistry.fromInit(provider.sender().address!, collectionContent)
    );

    await registry.send(
        provider.sender(),
        { value: toNano('0.1') },
        { $$type: 'Deploy', queryId: 0n }
    );

    await provider.waitForDeploy(registry.address);
    console.log('Registry deployed at:', registry.address);

    const count = await registry.getGetAgentCount();
    console.log('Initial agent count:', count);
}
