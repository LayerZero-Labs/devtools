import { PublicKey } from '@solana/web3.js'

import { OmniPoint } from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createSolanaConnectionFactory, createSolanaSignerFactory } from '@layerzerolabs/devtools-solana'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { IOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-solana'

export { createSolanaConnectionFactory }

export const createSdkFactory = (
    userAccount: PublicKey,
    programId: PublicKey,
    connectionFactory = createSolanaConnectionFactory()
) => {
    // To create a EVM/Solana SDK factory we need to merge the EVM and the Solana factories into one
    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())
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

    // the return value is an SDK factory that receives an OmniPoint and returns an SDK
    return async (point: OmniPoint): Promise<IOApp> =>
        endpointIdToChainType(point.eid) === ChainType.SOLANA ? solanaSdkFactory(point) : evmSdkFactory(point)
}

export { createSolanaSignerFactory }
