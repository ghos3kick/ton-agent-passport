import { AgentPassportSDK } from '@agent-passport/sdk';
import { REGISTRY_ADDRESS, TONAPI_BASE_URL, NETWORK } from './constants';

let sdkInstance: AgentPassportSDK | null = null;

export function getSDK(): AgentPassportSDK {
  if (!sdkInstance) {
    sdkInstance = new AgentPassportSDK({
      registryAddress: REGISTRY_ADDRESS,
      baseUrl: TONAPI_BASE_URL,
      network: NETWORK,
    });
  }
  return sdkInstance;
}
