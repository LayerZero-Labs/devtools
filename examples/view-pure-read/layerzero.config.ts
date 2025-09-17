import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppReadOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'ReadViewOrPure',
}

const config: OAppReadOmniGraphHardhat = {
    contracts: [
        {
            contract: arbitrumContract,
            config: {
                readLibrary: '0x54320b901FDe49Ba98de821Ccf374BA4358a8bf6',
                readChannels: [
                    {
                        channelId: ChannelId.READ_CHANNEL_1,
                        active: true,
                    },
                ],
                readConfig: {
                    ulnConfig: {
                        requiredDVNs: ['0x5c8c267174e1f345234ff5315d6cfd6716763bac'],
                        executor: '0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897',
                    },
                },
            },
        },
    ],
    connections: [],
}

export default config
