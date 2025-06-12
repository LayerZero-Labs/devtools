import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { type OAppReadOmniGraphHardhat, type OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'ReadPublic',
}

const config: OAppReadOmniGraphHardhat = {
    contracts: [
        {
            contract: sepoliaContract,
            config: {
                readChannelConfigs: [
                    {
                        channelId: ChannelId.READ_CHANNEL_1,
                        active: true,
                        readLibrary: '0x54320b901FDe49Ba98de821Ccf374BA4358a8bf6',
                        ulnConfig: {
                            requiredDVNs: ['0x5c8c267174e1f345234ff5315d6cfd6716763bac'],
                            executor: '0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897',
                        },
                        enforcedOptions: [
                            {
                                msgType: 1,
                                optionType: ExecutorOptionType.LZ_READ,
                                gas: 80000,
                                size: 1000000,
                                value: 0,
                            },
                        ],
                    },
                ],
            },
        },
    ],
    connections: [],
}

export default config
