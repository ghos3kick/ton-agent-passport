'use client';

import { useMemo } from 'react';
import { AgentPassportSDK } from '@agent-passport/sdk';
import { REGISTRY_ADDRESS, TONAPI_BASE_URL, NETWORK } from '@/lib/constants';

export function useSDK(): AgentPassportSDK {
  return useMemo(
    () =>
      new AgentPassportSDK({
        registryAddress: REGISTRY_ADDRESS,
        baseUrl: TONAPI_BASE_URL,
        network: NETWORK,
      }),
    [],
  );
}
