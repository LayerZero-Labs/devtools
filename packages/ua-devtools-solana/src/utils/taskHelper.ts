import { createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-solana'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniAddress } from '@layerzerolabs/devtools'
import { Timeout, Uln302ConfigType, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-solana'
import { EndpointProgram, UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'

const createSolanaConnectionFactory = () =>
    createConnectionFactory(
        createRpcUrlFactory({
            [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA,
            [EndpointId.SOLANA_V2_TESTNET]: process.env.RPC_URL_SOLANA_TESTNET,
        })
    )

const connectionFactory = createSolanaConnectionFactory()

/**
 * Get the receive config for a Solana OApp
 * @param localEid {EndpointId} EndpointId.SOLANA_V2_TESTNET or EndpointId.SOLANA_V2_MAINNET
 * @param remoteEid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 */
export async function getSolanaReceiveConfig(
    localEid: EndpointId,
    remoteEid: EndpointId,
    address: OmniAddress
): Promise<[OmniAddress, Uln302UlnConfig, Timeout] | undefined> {
    const endpoint = new EndpointV2(
        await connectionFactory(localEid),
        { eid: localEid, address: EndpointProgram.PROGRAM_ID.toBase58() },
        EndpointProgram.PROGRAM_ID // user PK does not matter, we are only reading
    )
    return [
        address,
        await endpoint.getAppUlnConfig(address, UlnProgram.PROGRAM_ID.toBase58(), remoteEid, Uln302ConfigType.Receive),
        {
            lib: UlnProgram.PROGRAM_ID.toBase58(),
            expiry: 0n, // unsupported for Solana
        },
    ]
}

/**
 * Get the send config for a Solana OApp.
 * @param localEid {EndpointId} EndpointId.SOLANA_V2_TESTNET or EndpointId.SOLANA_V2_MAINNET
 * @param remoteEid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 */
export async function getSolanaSendConfig(
    localEid: EndpointId,
    remoteEid: EndpointId,
    address: OmniAddress
): Promise<[OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    const endpoint = new EndpointV2(
        await connectionFactory(localEid),
        { eid: localEid, address: EndpointProgram.PROGRAM_ID.toBase58() },
        EndpointProgram.PROGRAM_ID // does not matter, we are only reading here
    )
    const sendLibrary = await endpoint.getSendLibrary(address, remoteEid)
    if (!sendLibrary) {
        throw new Error(`Send Library not set from ${localEid} to ${remoteEid}`)
    }
    return [
        sendLibrary,
        await endpoint.getAppUlnConfig(address, UlnProgram.PROGRAM_ID.toBase58(), remoteEid, Uln302ConfigType.Send),
        await endpoint.getAppExecutorConfig(address, sendLibrary, remoteEid),
    ]
}
