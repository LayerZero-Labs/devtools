import { PublicKey } from '@solana/web3.js'
import { ConnectionFactory, createConnectionFactory, defaultRpcUrlFactory } from '@layerzerolabs/devtools-solana'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointV2 } from '@/endpointv2'
import { normalizePeer } from '@layerzerolabs/devtools'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'

describe('endpointv2/sdk', () => {
    // FIXME These tests are using a mainnet OFT deployment and are potentially very fragile
    //
    // We need to run our own Solana node with the OFT account cloned
    // so that we can isolate these tests
    const point = { eid: EndpointId.SOLANA_V2_MAINNET, address: EndpointProgram.PROGRAM_ID.toBase58() }
    const account = new PublicKey('6tzUZqC33igPgP7YyDnUxQg6eupMmZGRGKdVAksgRzvk')
    const oftConfig = new PublicKey('8aFeCEhGLwbWHWiiezLAKanfD5Cn3BW3nP6PZ54K9LYC')

    let connectionFactory: ConnectionFactory

    beforeAll(() => {
        connectionFactory = createConnectionFactory(defaultRpcUrlFactory)
    })

    describe('getDefaultReceiveLibrary', () => {
        it('should return undefined if we are asking for a default library that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.getDefaultReceiveLibrary(EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a library that has been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const lib = await sdk.getDefaultReceiveLibrary(EndpointId.ETHEREUM_V2_MAINNET)
            expect(lib).toEqual(expect.any(String))
            expect(normalizePeer(lib, EndpointId.ETHEREUM_V2_MAINNET)).toEqual(expect.any(Uint8Array))
        })
    })

    describe('getDefaultSendLibrary', () => {
        it('should return undefined if we are asking for a default library that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.getDefaultSendLibrary(EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a library that has been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const lib = await sdk.getDefaultSendLibrary(eid)
            expect(lib).toEqual<string>(expect.any(String))
            expect(normalizePeer(lib, eid)).toEqual(expect.any(Uint8Array))

            expect(await sdk.isDefaultSendLibrary(lib!, eid)).toBeTruthy()
            expect(await sdk.isDefaultSendLibrary(EndpointProgram.PROGRAM_ID.toBase58(), eid)).toBeFalsy()
        })
    })

    describe('getReceiveLibrary', () => {
        it('should return undefined if we are asking for a default library that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.getReceiveLibrary(account.toBase58(), EndpointId.ETHEREUM_V2_TESTNET)).toEqual([
                undefined,
                true,
            ])
        })

        it('should return a Solana address if we are asking for a library that has been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const [lib] = await sdk.getReceiveLibrary(oftConfig.toBase58(), eid)
            expect(lib).toEqual<string>(expect.any(String))
            expect(normalizePeer(lib, eid)).toEqual(expect.any(Uint8Array))
        })
    })

    describe('getSendLibrary', () => {
        it('should return undefined if we are asking for a default library that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.getSendLibrary(account.toBase58(), EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a library that has been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const lib = await sdk.getSendLibrary(oftConfig.toBase58(), eid)
            expect(lib).toEqual<string>(expect.any(String))
            expect(normalizePeer(lib, eid)).toEqual(expect.any(Uint8Array))
        })
    })
})
