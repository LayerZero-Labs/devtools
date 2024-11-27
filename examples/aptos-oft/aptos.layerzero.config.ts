import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyOFT',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: 50008 as EndpointId,
    contractName: 'oft',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: fujiContract,
        },
        {
            contract: sepoliaContract,
        },
        {
            contract: aptosContract,
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: sepoliaContract,
        },
        {
            from: fujiContract,
            to: aptosContract,
        },
        {
            from: aptosContract,
            to: fujiContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 100000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 100000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 0, // amount of native gas token in wei to drop to receiver address
                        receiver: '0x0000000000000000000000000000000000000000',
                    },
                ],
                sendLibrary: '0x69BF5f48d2072DfeBc670A1D19dff91D0F4E8170',
                receiveLibraryConfig: {
                    // Required Receive Library Address on BSC
                    receiveLibrary: '0x0000000000000000000000000000000000000000',
                    // Optional Grace Period for Switching Receive Library Address on BSC
                    gracePeriod: BigInt(0),
                },
                // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on BSC
                receiveLibraryTimeoutConfig: {
                    lib: '0x0000000000000000000000000000000000000000',
                    expiry: BigInt(0),
                },
            },
        },
        {
            from: sepoliaContract,
            to: fujiContract,
        },
    ],
}

export default config
