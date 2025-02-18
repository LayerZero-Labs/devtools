import { EndpointId } from '@layerzerolabs/lz-definitions'

// import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// Note:  Do not use address for EVM OmniPointHardhat contracts.  Contracts are loaded using hardhat-deploy.
// If you do use an address, ensure artifacts exists.
const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyOFT',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    address: '', // NOTE: update this with the OFTStore address.
}

// Learn about Message Execution Options: https://docs.layerzero.network/v2/developers/solana/oft/account#message-execution-options
// Note: for a simpler config experience, check out the experimental Simple Config Generator - https://docs.layerzero.network/v2/developers/evm/technical-reference/simple-config
const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: sepoliaContract,
        },
        {
            contract: solanaContract,
        },
    ],
    connections: [
        {
            from: sepoliaContract,
            to: solanaContract,
            // NOTE: Here are some default settings that have been found to work well sending to Solana.
            // You need to either enable these enforcedOptions or pass in extraOptions when calling send().
            // Having neither will cause a revert when calling send().
            // We suggest performing additional profiling to ensure they are correct for your use case.
            // config: {
            //     enforcedOptions: [
            //         {
            //             msgType: 1,
            //             optionType: ExecutorOptionType.LZ_RECEIVE,
            //             gas: 200000,
            //             value: 2500000,
            //         },
            //         {
            //             msgType: 2,
            //             optionType: ExecutorOptionType.LZ_RECEIVE,
            //             gas: 200000,
            //             value: 2500000,
            //         },
            //         {
            //             // Solana options use (gas == compute units, value == lamports)
            //             msgType: 2,
            //             optionType: ExecutorOptionType.COMPOSE,
            //             index: 0,
            //             gas: 0,
            //             value: 0,
            //         },
            //     ],
            // },
        },
        {
            from: solanaContract,
            to: sepoliaContract,
            // TODO Here are some default settings that have been found to work well sending to Sepolia.
            // You need to either enable these enforcedOptions or pass in extraOptions when calling send().
            // Having neither will cause a revert when calling send().
            // We suggest performing additional profiling to ensure they are correct for your use case.
            // config: {
            //     sendLibrary: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
            //     receiveLibraryConfig: {
            //         receiveLibrary: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
            //         gracePeriod: BigInt(0),
            //     },
            //     // Optional Send Configuration
            //     // @dev Controls how the `from` chain sends messages to the `to` chain.
            //     sendConfig: {
            //         executorConfig: {
            //             maxMessageSize: 10000,
            //             // The configured Executor address.  Note, this is the executor PDA not the program ID.
            //             executor: 'AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK',
            //         },
            //         ulnConfig: {
            //             // // The number of block confirmations to wait before emitting the message from the source chain.
            //             confirmations: BigInt(10),
            //             // The address of the DVNs you will pay to verify a sent message on the source chain ).
            //             // The destination tx will wait until ALL `requiredDVNs` verify the message.
            //             requiredDVNs: [
            //                 '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb', // LayerZero
            //             ],
            //             // The address of the DVNs you will pay to verify a sent message on the source chain ).
            //             // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
            //             optionalDVNs: [],
            //             // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
            //             optionalDVNThreshold: 0,
            //         },
            //     },
            //     // Optional Receive Configuration
            //     // @dev Controls how the `from` chain receives messages from the `to` chain.
            //     receiveConfig: {
            //         ulnConfig: {
            //             // The number of block confirmations to expect from the `to` chain.
            //             confirmations: BigInt(2),
            //             // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain ).
            //             // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
            //             requiredDVNs: [
            //                 '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb', // LayerZero
            //             ],
            //             // The address of the DVNs you will pay to verify a sent message on the source chain ).
            //             // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
            //             optionalDVNs: [],
            //             // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
            //             optionalDVNThreshold: 0,
            //         },
            //     },
            //     enforcedOptions: [
            //         {
            //             msgType: 1,
            //             optionType: ExecutorOptionType.LZ_RECEIVE,
            //             gas: 200000,
            //         },
            //         {
            //             msgType: 2,
            //             optionType: ExecutorOptionType.LZ_RECEIVE,
            //             gas: 200000,
            //         },
            //     ],
            // },
        },
    ],
}

export default config
