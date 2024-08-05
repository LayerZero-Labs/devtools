import pMemoize from 'p-memoize'

import { OmniPoint } from '@layerzerolabs/devtools'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'

import { OFT } from './sdk'
import { OFTFactory } from './types'

import type { OmniContractFactory } from '@layerzerolabs/devtools-evm'
import type { EndpointV2Factory } from '@layerzerolabs/protocol-devtools'

export const createOFTFactory = <TOmniPoint = never>(
    contractFactory: OmniContractFactory<TOmniPoint | OmniPoint>,
    endpointV2Factory: EndpointV2Factory = createEndpointV2Factory(contractFactory)
): OFTFactory<TOmniPoint> => pMemoize(async (point) => new OFT(await contractFactory(point), endpointV2Factory))
