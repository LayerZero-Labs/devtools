import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppReadOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'ReadViewOrPure',
}

const config: OAppReadOmniGraphHardhat = {
    contracts: [
        {
            contract: sepoliaContract,
            config: {
                readLibrary: '0xbcd4CADCac3F767C57c4F402932C4705DF62BEFf',
                readChannels: [
                    {
                        channelId: ChannelId.READ_CHANNEL_1,
                        active: true,
                    },
                ],
                readConfig: {
                    ulnConfig: {
                        requiredDVNs: ['0x1308151a7ebac14f435d3ad5ff95c34160d539a5'],
                        executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
                    },
                },
            },
        },
    ],
    connections: [],
}

export default config
