import { Connection, PublicKey } from '@solana/web3.js'
import { ConnectionFactory, createConnectionFactory, defaultRpcUrlFactory } from '@layerzerolabs/devtools-solana'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointV2 } from '@/endpointv2'
import { formatEid, normalizePeer } from '@layerzerolabs/devtools'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'

describe('endpointv2/sdk', () => {
    // FIXME These tests are using a mainnet OFT deployment and are potentially very fragile
    //
    // We need to run our own Solana node with the OFT account cloned
    // so that we can isolate these tests
    const point = { eid: EndpointId.SOLANA_V2_MAINNET, address: EndpointProgram.PROGRAM_ID.toBase58() }
    const account = new PublicKey('6tzUZqC33igPgP7YyDnUxQg6eupMmZGRGKdVAksgRzvk')
    const oftConfig = new PublicKey('8aFeCEhGLwbWHWiiezLAKanfD5Cn3BW3nP6PZ54K9LYC')
    const uln = new PublicKey('7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH')

    const blockhash = '3dY6Hp5N6MiztdurusKF59i2fE9tJbo9nPf5JsFarJFg'

    let connectionFactory: ConnectionFactory

    beforeAll(() => {
        connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

        // We mock the getLatestBlockhash to reduce the RPC load
        jest.spyOn(Connection.prototype, 'getLatestBlockhash').mockResolvedValue({
            blockhash,
            lastValidBlockHeight: NaN,
        })
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

    describe('isDefaultSendLibrary', () => {
        it('should return true if the default send library is being used', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.isDefaultSendLibrary(oftConfig.toBase58(), EndpointId.FLARE_V2_MAINNET)).toBeTruthy()
        })

        it('should return false if the default send library is not being used', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.isDefaultSendLibrary(oftConfig.toBase58(), EndpointId.ETHEREUM_V2_MAINNET)).toBeFalsy()
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
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const [lib] = await sdk.getReceiveLibrary(oftConfig.toBase58(), eid)
            expect(lib).toEqual<string>(expect.any(String))
            expect(normalizePeer(lib, eid)).toEqual(expect.any(Uint8Array))
        })
    })

    describe('setReceiveLibrary', () => {
        it('should create a set receive library instruction with the specified ULN if specified', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const setReceiveLibraryMock = jest.spyOn(sdk.program, 'setReceiveLibrary')

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const omniTransaction = await sdk.setReceiveLibrary(oftConfig.toBase58(), eid, uln.toBase58(), BigInt(0))
            expect(omniTransaction).toEqual({
                data: expect.any(String),
                description: `Setting receive library for eid ${eid} (${formatEid(eid)}) and OApp ${oftConfig.toBase58()} to ${uln.toBase58()}`,
                point: sdk.point,
            })

            expect(setReceiveLibraryMock).toHaveBeenCalledTimes(1)
            expect(setReceiveLibraryMock).toHaveBeenCalledWith(sdk.userAccount, oftConfig, uln, eid, 0)
        })

        it('should get the default ULN if ULN is not specified', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const setReceiveLibraryMock = jest.spyOn(sdk.program, 'setReceiveLibrary')

            const mockDefaultReceiveLibrary = '3dY6Hp5N6MiztdurusKF59i2fE9tJbo9nPf5JsFarJFg'
            const getDefaultReceiveLibraryMock = jest
                .spyOn(sdk, 'getDefaultReceiveLibrary')
                .mockResolvedValue(mockDefaultReceiveLibrary)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const omniTransaction = await sdk.setReceiveLibrary(oftConfig.toBase58(), eid, undefined, BigInt(0))
            expect(omniTransaction).toEqual({
                data: expect.any(String),
                description: `Setting receive library for eid ${eid} (${formatEid(eid)}) and OApp ${oftConfig.toBase58()} to ${mockDefaultReceiveLibrary}`,
                point: sdk.point,
            })

            expect(getDefaultReceiveLibraryMock).toHaveBeenCalledTimes(1)
            expect(getDefaultReceiveLibraryMock).toHaveBeenCalledWith(eid)

            expect(setReceiveLibraryMock).toHaveBeenCalledTimes(1)
            expect(setReceiveLibraryMock).toHaveBeenCalledWith(
                sdk.userAccount,
                oftConfig,
                new PublicKey(mockDefaultReceiveLibrary),
                eid,
                0
            )
        })
    })

    describe('getSendLibrary', () => {
        it('should return undefined if we are asking for a default library that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            expect(await sdk.getSendLibrary(account.toBase58(), EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a library that has been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const lib = await sdk.getSendLibrary(oftConfig.toBase58(), eid)
            expect(lib).toEqual<string>(expect.any(String))
            expect(normalizePeer(lib, eid)).toEqual(expect.any(Uint8Array))
        })
    })

    describe('setSendLibrary', () => {
        it('should create a set send library instruction with the specified ULN if specified', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const setSendLibraryMock = jest.spyOn(sdk.program, 'setSendLibrary')

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const omniTransaction = await sdk.setSendLibrary(oftConfig.toBase58(), eid, uln.toBase58())
            expect(omniTransaction).toEqual({
                data: expect.any(String),
                description: `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oftConfig.toBase58()} to ${uln.toBase58()}`,
                point: sdk.point,
            })

            expect(setSendLibraryMock).toHaveBeenCalledTimes(1)
            expect(setSendLibraryMock).toHaveBeenCalledWith(sdk.userAccount, oftConfig, uln, eid)
        })

        it('should get the default ULN if ULN is not specified', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new EndpointV2(connection, point, account)

            const setSendLibraryMock = jest.spyOn(sdk.program, 'setSendLibrary')

            const mockDefaultSendLibrary = '3dY6Hp5N6MiztdurusKF59i2fE9tJbo9nPf5JsFarJFg'
            const getDefaultSendLibraryMock = jest
                .spyOn(sdk, 'getDefaultSendLibrary')
                .mockResolvedValue(mockDefaultSendLibrary)

            const eid = EndpointId.ETHEREUM_V2_MAINNET
            const omniTransaction = await sdk.setSendLibrary(oftConfig.toBase58(), eid, undefined)
            expect(omniTransaction).toEqual({
                data: expect.any(String),
                description: `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oftConfig.toBase58()} to ${mockDefaultSendLibrary}`,
                point: sdk.point,
            })

            expect(getDefaultSendLibraryMock).toHaveBeenCalledTimes(1)
            expect(getDefaultSendLibraryMock).toHaveBeenCalledWith(eid)

            expect(setSendLibraryMock).toHaveBeenCalledTimes(1)
            expect(setSendLibraryMock).toHaveBeenCalledWith(
                sdk.userAccount,
                oftConfig,
                new PublicKey(mockDefaultSendLibrary),
                eid
            )
        })
    })
})
