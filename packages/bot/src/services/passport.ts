import { AgentPassportSDK } from '@agent-passport/sdk';
import { config } from '../config';

let _sdk: AgentPassportSDK | null = null;

export function getSDK(): AgentPassportSDK {
    if (!_sdk) {
        _sdk = new AgentPassportSDK({
            registryAddress: config.registryAddress,
            tonapiKey: config.tonapiKey,
            network: config.network,
        });
    }
    return _sdk;
}
