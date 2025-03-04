import assert from 'assert'

import { Keypair, PublicKey } from '@solana/web3.js'

import {
    OmniPoint,
    OmniSigner,
    OmniTransactionReceipt,
    OmniTransactionResponse,
    firstFactory,
    formatEid,
} from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import {
    OmniSignerSolana,
    OmniSignerSolanaSquads,
    createConnectionFactory,
    createRpcUrlFactory,
} from '@layerzerolabs/devtools-solana'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { IOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-solana'

export const createSolanaConnectionFactory = () =>
    createConnectionFactory(
        createRpcUrlFactory({
            [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA,
            [EndpointId.SOLANA_V2_TESTNET]: process.env.RPC_URL_SOLANA_TESTNET,
        })
    )

export const createSdkFactory = (
    userAccount: PublicKey,
    programId: PublicKey,
    connectionFactory = createSolanaConnectionFactory()
) => {
    // To create a EVM/Solana SDK factory we need to merge the EVM and the Solana factories into one
    //
    // We do this by using the firstFactory helper function that is provided by the devtools package.
    // This function will try to execute the factories one by one and return the first one that succeeds.
    const evmSdkfactory = createOAppFactory(createConnectedContractFactory())
    const solanaSdkFactory = createOFTFactory(
        // The first parameter to createOFTFactory is a user account factory
        //
        // This is a function that receives an OmniPoint ({ eid, address } object)
        // and returns a user account to be used with that SDK.
        //
        // For our purposes this will always be the user account coming from the secret key passed in
        () => userAccount,
        // The second parameter is a program ID factory
        //
        // This is a function that receives an OmniPoint ({ eid, address } object)
        // and returns a program ID to be used with that SDK.
        //
        // Since we only have one OFT deployed, this will always be the program ID passed as a CLI parameter.
        //
        // In situations where we might have multiple configs with OFTs using multiple program IDs,
        // this function needs to decide which one to use.
        () => programId,
        // Last but not least the SDK will require a connection
        connectionFactory
    )

    // We now "merge" the two SDK factories into one.
    //
    // We do this by using the firstFactory helper function that is provided by the devtools package.
    // This function will try to execute the factories one by one and return the first one that succeeds.
    return firstFactory<[OmniPoint], IOApp>(evmSdkfactory, solanaSdkFactory)
}

export const createSolanaSignerFactory = (
    wallet: Keypair,
    connectionFactory = createSolanaConnectionFactory(),
    multisigKey?: PublicKey
) => {
    return async (eid: EndpointId): Promise<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> => {
        assert(
            endpointIdToChainType(eid) === ChainType.SOLANA,
            `Solana signer factory can only create signers for Solana networks. Received ${formatEid(eid)}`
        )

        return multisigKey
            ? new OmniSignerSolanaSquads(eid, await connectionFactory(eid), multisigKey, wallet)
            : new OmniSignerSolana(eid, await connectionFactory(eid), wallet)
    }
}

export function uint8ArrayToHex(uint8Array: Uint8Array, prefix = false): string {
    const hexString = Buffer.from(uint8Array).toString('hex')
    return prefix ? `0x${hexString}` : hexString
}

export function parse32BytesArrayIntoEvmAddress(uint8Array: Uint8Array): string {
    return uint8ArrayToHex(uint8Array.slice(12), true)
}

export function formatBytesAddressPerChainType(chainType: ChainType, uint8Array: Uint8Array) {
    switch (chainType) {
        case ChainType.EVM:
            return parse32BytesArrayIntoEvmAddress(uint8Array)
        default:
            throw new Error(`formatBytesAddressPerChainType not implemented yet for chain type ${chainType}`)
    }
}
