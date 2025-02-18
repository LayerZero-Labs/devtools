import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppReadOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'UniswapV3QuoteDemo',
}

const config: OAppReadOmniGraphHardhat = {
    contracts: [
        {
            contract: arbitrumContract,
            config: {
                readChannelConfigs: [
                    {
                        channelId: ChannelId.READ_CHANNEL_1,
                        active: true,
                        readLibrary: '0xbcd4CADCac3F767C57c4F402932C4705DF62BEFf',
                        ulnConfig: {
                            executor: '0x31CAe3B7fB82d847621859fb1585353c5720660D',
                            requiredDVNs: ['0x1308151a7ebac14f435d3ad5ff95c34160d539a5'],
                        },
                    },
                ],
            },
        },
    ],
    connections: [],
}

export default config
