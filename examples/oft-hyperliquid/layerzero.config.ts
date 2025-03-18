import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

enum MsgType {
    SEND = 1,
    SEND_AND_CALL = 2,
}

const bscTestnetContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyHyperLiquidOFT',
}

const hyperliquidTestnetContract: OmniPointHardhat = {
    eid: EndpointId.HYPERLIQUID_V2_TESTNET,
    contractName: 'MyHyperLiquidOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscTestnetContract,
            config: {
                owner: '',
                delegate: '',
            },
        },
        {
            contract: hyperliquidTestnetContract,
            config: {
                delegate: '',
                owner: '',
            },
        },
    ],
    connections: [
        {
            from: bscTestnetContract,
            to: hyperliquidTestnetContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: MsgType.SEND,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: MsgType.SEND_AND_CALL,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                ],
                sendLibrary: '',
                receiveLibraryConfig: {
                    receiveLibrary: '',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10_000,
                        executor: '',
                    },
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: [''],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: [''],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: hyperliquidTestnetContract,
            to: bscTestnetContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: MsgType.SEND,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: MsgType.SEND_AND_CALL,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                ],
                sendLibrary: '',
                receiveLibraryConfig: {
                    receiveLibrary: '',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10_000,
                        executor: '',
                    },
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: [''],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: [''],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
    ],
}

export default config
