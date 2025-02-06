import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_TESTNET, /// EndpointV1
    contractName: 'MyLzApp',
}

const arbSepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOApp',
}

// The values here are for development purposes. E.g. confirmations are set to 1. For production, they should be reviewed and edited accordingly.
const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: sepoliaContract,
        },
        {
            contract: arbSepoliaContract,
        },
    ],
    connections: [
        {
            from: arbSepoliaContract,
            to: sepoliaContract,
            config: {
                sendLibrary: '0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E',
                receiveLibraryConfig: {
                    receiveLibrary: '0x75Db67CDab2824970131D5aa9CECfC9F69c69636',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897',
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x3a74f7174709842d3b8a14ce60b4aa2499f2a2f2'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x3a74f7174709842d3b8a14ce60b4aa2499f2a2f2'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: sepoliaContract,
            to: arbSepoliaContract,
            config: {
                sendLibrary: '0x6862b19f6e42a810946B9C782E6ebE26Ad266C84',
                receiveLibraryConfig: {
                    receiveLibrary: '0x5937A5fe272fbA38699A1b75B3439389EEFDb399',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x718B92b5CB0a5552039B593faF724D182A881eDA',
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x68802e01d6321d5159208478f297d7007a7516ed'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x68802e01d6321d5159208478f297d7007a7516ed'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
    ],
}

export default config
