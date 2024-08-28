import { PublicKey } from '@solana/web3.js'
import { ConnectionFactory, createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-solana'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT } from '@/oft'
import { makeBytes32, normalizePeer } from '@layerzerolabs/devtools'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { printJson } from '@layerzerolabs/io-devtools'
import { EndpointProgram, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

const createSetEnforcedOptionsIxMock = OftTools.createSetEnforcedOptionsIx as jest.Mock

jest.mock('@layerzerolabs/lz-solana-sdk-v2', () => {
    const actual = jest.requireActual('@layerzerolabs/lz-solana-sdk-v2')

    return {
        ...actual,
        OftTools: {
            ...actual.OftTools,
            createSetEnforcedOptionsIx: jest.fn().mockImplementation(actual.OftTools.createSetEnforcedOptionsIx),
        },
    }
})

describe('oft/sdk', () => {
    // FIXME These tests are using a mainnet OFT deployment and are potentially very fragile
    //
    // We need to run our own Solana node with the OFT account cloned
    // so that we can isolate these tests
    const programId = new PublicKey('Ag28jYmND83RnwcSFq2vwWxThSya55etjWJwubd8tRXs')
    const point = { eid: EndpointId.SOLANA_V2_MAINNET, address: '8aFeCEhGLwbWHWiiezLAKanfD5Cn3BW3nP6PZ54K9LYC' }
    const account = new PublicKey('6tzUZqC33igPgP7YyDnUxQg6eupMmZGRGKdVAksgRzvk')

    let connectionFactory: ConnectionFactory

    beforeAll(() => {
        connectionFactory = createConnectionFactory(
            createRpcUrlFactory({
                [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA_MAINNET,
                [EndpointId.SOLANA_V2_TESTNET]: process.env.RPC_URL_SOLANA_TESTNET,
            })
        )
    })

    afterEach(() => {
        createSetEnforcedOptionsIxMock.mockClear()
    })

    describe('getPeer', () => {
        it('should return undefined if we are asking for a peer that has not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            expect(await sdk.getPeer(EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a peer that has been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const peer = await sdk.getPeer(EndpointId.ETHEREUM_V2_MAINNET)
            expect(peer).toEqual(expect.any(String))
            expect(normalizePeer(peer, EndpointId.ETHEREUM_V2_MAINNET)).toEqual(expect.any(Uint8Array))

            expect(await sdk.hasPeer(EndpointId.ETHEREUM_V2_MAINNET, peer)).toBeTruthy()
            expect(await sdk.hasPeer(EndpointId.ETHEREUM_V2_MAINNET, undefined)).toBeFalsy()
            expect(await sdk.hasPeer(EndpointId.ETHEREUM_V2_MAINNET, null)).toBeFalsy()
            expect(await sdk.hasPeer(EndpointId.ETHEREUM_V2_MAINNET, makeBytes32())).toBeFalsy()
        })
    })

    describe('setPeer', () => {
        describe('for EVM', () => {
            it('should return an OmniTransaction', async () => {
                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, programId)

                const omniTransaction = await sdk.setPeer(EndpointId.ETHEREUM_V2_MAINNET, makeBytes32())
                expect(omniTransaction).toEqual({
                    data: expect.any(String),
                    point,
                    description: `Setting peer for eid ${EndpointId.ETHEREUM_V2_MAINNET} (ETHEREUM_V2_MAINNET) to address 0x0000000000000000000000000000000000000000000000000000000000000000`,
                })
            })
        })

        describe('for Aptos', () => {
            it('should return an OmniTransaction', async () => {
                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, programId)

                const omniTransaction = await sdk.setPeer(EndpointId.APTOS_MAINNET, makeBytes32())
                expect(omniTransaction).toEqual({
                    data: expect.any(String),
                    point,
                    description: `Setting peer for eid ${EndpointId.APTOS_MAINNET} (APTOS_MAINNET) to address 0x0000000000000000000000000000000000000000000000000000000000000000`,
                })
            })
        })

        describe('for Solana', () => {
            it('should return an OmniTransaction', async () => {
                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, programId)

                const omniTransaction = await sdk.setPeer(EndpointId.SOLANA_V2_MAINNET, point.address)
                expect(omniTransaction).toEqual({
                    data: expect.any(String),
                    point,
                    description: `Setting peer for eid ${EndpointId.SOLANA_V2_MAINNET} (SOLANA_V2_MAINNET) to address ${makeBytes32(normalizePeer(point.address, EndpointId.SOLANA_V2_MAINNET))}`,
                })
            })
        })
    })

    describe('getDelegate', () => {
        it('should return a Solana address if we are asking for a delegate that has been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const delegate = await sdk.getDelegate()
            expect(delegate).toEqual(expect.any(String))

            expect(await sdk.isDelegate(delegate!)).toBeTruthy()
        })
    })

    describe('setDelegate', () => {
        it('should return an omnitransaction', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const delegate = PublicKey.default.toBase58()
            const omniTransaction = await sdk.setDelegate(delegate)

            expect(omniTransaction).toEqual({
                data: expect.any(String),
                point,
                description: `Setting delegate to ${delegate}`,
            })
        })
    })

    describe('getOwner', () => {
        it('should return a Solana address', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const owner = await sdk.getOwner()
            expect(owner).toEqual(expect.any(String))

            expect(await sdk.hasOwner(owner!)).toBeTruthy()
            expect(await sdk.hasOwner(PublicKey.default.toBase58())).toBeFalsy()
        })
    })

    describe('setOwner', () => {
        it('should return an omnitransaction', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const owner = PublicKey.default.toBase58()
            const omniTransaction = await sdk.setOwner(owner)

            expect(omniTransaction).toEqual({
                data: expect.any(String),
                point,
                description: `Setting owner to ${owner}`,
            })
        })
    })

    describe('getEnforcedOptions', () => {
        it('should throw if we are trying to get an option for invalid msgType', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            await expect(sdk.getEnforcedOptions(EndpointId.ETHEREUM_V2_TESTNET, 3)).rejects.toMatchSnapshot()
        })

        it('should return an empty bytes if we are asking for options that have not been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            expect(await sdk.getEnforcedOptions(EndpointId.ETHEREUM_V2_TESTNET, 1)).toBe('0x')
        })

        it('should return an a hex string if we are asking for options that have been set', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const sendOptionsHex = await sdk.getEnforcedOptions(EndpointId.ETHEREUM_V2_MAINNET, 1)
            expect(sendOptionsHex).toEqual(expect.any(String))

            const sendOptions = Options.fromOptions(sendOptionsHex)
            expect(sendOptions).toMatchSnapshot()

            const sendAndCallOptionsHex = await sdk.getEnforcedOptions(EndpointId.ETHEREUM_V2_MAINNET, 2)
            expect(sendAndCallOptionsHex).toEqual(expect.any(String))

            const sendAndCallOptions = Options.fromOptions(sendAndCallOptionsHex)
            expect(sendAndCallOptions).toMatchSnapshot()
        })
    })

    describe('setEnforcedOptions', () => {
        it('should throw if we are trying to get an option for invalid msgType', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            await expect(
                sdk.setEnforcedOptions([
                    {
                        eid: EndpointId.ETHEREUM_V2_TESTNET,
                        option: { msgType: 7, options: Options.newOptions().toHex() },
                    },
                ])
            ).rejects.toMatchSnapshot()
        })

        it('should return an omnitransaction if called with valid msgType', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const enforcedOptions = [
                {
                    eid: EndpointId.ETHEREUM_V2_TESTNET,
                    option: { msgType: 1, options: Options.newOptions().toHex() },
                },
            ]
            const omniTransaction = await sdk.setEnforcedOptions(enforcedOptions)

            expect(omniTransaction).toEqual({
                data: expect.any(String),
                point,
                description: `Setting enforced options to ${printJson(enforcedOptions)}`,
            })
        })

        it('should create instructions grouped by eid', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)

            const enforcedOptions = [
                // We'll set two options for ethereum
                {
                    eid: EndpointId.ETHEREUM_V2_TESTNET,
                    option: { msgType: 1, options: Options.newOptions().addExecutorOrderedExecutionOption().toHex() },
                },
                {
                    eid: EndpointId.ETHEREUM_V2_TESTNET,
                    option: { msgType: 2, options: Options.newOptions().addExecutorLzReceiveOption(1, 1).toHex() },
                },
                // One option for base
                {
                    eid: EndpointId.BASE_V2_MAINNET,
                    option: { msgType: 1, options: Options.newOptions().addExecutorLzReceiveOption(4, 1).toHex() },
                },
                // And we add a duplicte option for Avalanche
                //
                // The first one should be ignored
                {
                    eid: EndpointId.AVALANCHE_V2_MAINNET,
                    option: { msgType: 2, options: Options.newOptions().addExecutorLzReceiveOption(2, 1).toHex() },
                },
                {
                    eid: EndpointId.AVALANCHE_V2_MAINNET,
                    option: { msgType: 2, options: Options.newOptions().addExecutorLzReceiveOption(3, 1).toHex() },
                },
            ]

            await sdk.setEnforcedOptions(enforcedOptions)

            expect(createSetEnforcedOptionsIxMock).toHaveBeenCalledTimes(3)

            // Ethereum should have both msgType options set
            expect(createSetEnforcedOptionsIxMock).toHaveBeenCalledWith(
                programId,
                sdk.userAccount,
                sdk.publicKey,
                EndpointId.ETHEREUM_V2_TESTNET,
                Options.newOptions().addExecutorOrderedExecutionOption().toBytes(),
                Options.newOptions().addExecutorLzReceiveOption(1, 1).toBytes()
            )

            // Base should have one option set
            expect(createSetEnforcedOptionsIxMock).toHaveBeenCalledWith(
                programId,
                sdk.userAccount,
                sdk.publicKey,
                EndpointId.BASE_V2_MAINNET,
                Options.newOptions().addExecutorLzReceiveOption(4, 1).toBytes(),
                Options.newOptions().toBytes()
            )

            // Avalanche should use the latter option and ignore the first one
            expect(createSetEnforcedOptionsIxMock).toHaveBeenCalledWith(
                programId,
                sdk.userAccount,
                sdk.publicKey,
                EndpointId.AVALANCHE_V2_MAINNET,
                Options.newOptions().toBytes(),
                Options.newOptions().addExecutorLzReceiveOption(3, 1).toBytes()
            )
        })
    })

    describe('getEndpointSDK', () => {
        it('should return an SDK with the correct eid and address', async () => {
            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, programId)
            const endpointSdk = await sdk.getEndpointSDK()

            expect(endpointSdk.point).toEqual({ eid: sdk.point.eid, address: EndpointProgram.PROGRAM_ID.toBase58() })

            // Run a random function on the SDK to check whether it works
            expect(
                await endpointSdk.isDefaultSendLibrary(sdk.publicKey.toBase58(), EndpointId.ETHEREUM_V2_MAINNET)
            ).toBeFalsy()
        })
    })
})
