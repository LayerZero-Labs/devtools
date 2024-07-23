import { PublicKey } from '@solana/web3.js'
import { createConnectionFactory, defaultRpcUrlFactory } from '@layerzerolabs/devtools-solana'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT } from '@/oft'
import { makeBytes32, normalizePeer } from '@layerzerolabs/devtools'

describe('oft/sdk', () => {
    // FIXME These tests are using a mainnet OFT deployment and are potentially very fragile
    //
    // We need to run our own Solana node with the OFT account cloned
    // so that we can isolate these tests
    const point = { eid: EndpointId.SOLANA_V2_MAINNET, address: 'Ag28jYmND83RnwcSFq2vwWxThSya55etjWJwubd8tRXs' }
    const account = new PublicKey('6tzUZqC33igPgP7YyDnUxQg6eupMmZGRGKdVAksgRzvk')
    const mintAccount = new PublicKey('Bq9wBU8fqFnUDkrWqLFXGRc7BvRMPjUkCM2SrJf6dBMv')

    describe('getPeer', () => {
        it('should return undefined if we are asking for a peer that has not been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, mintAccount)

            expect(await sdk.getPeer(EndpointId.ETHEREUM_V2_TESTNET)).toBeUndefined()
        })

        it('should return a Solana address if we are asking for a peer that has been set', async () => {
            const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

            const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
            const sdk = new OFT(connection, point, account, mintAccount)

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
                const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, mintAccount)

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
                const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, mintAccount)

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
                const connectionFactory = createConnectionFactory(defaultRpcUrlFactory)

                const connection = await connectionFactory(EndpointId.SOLANA_V2_MAINNET)
                const sdk = new OFT(connection, point, account, mintAccount)

                const omniTransaction = await sdk.setPeer(EndpointId.SOLANA_V2_MAINNET, point.address)
                expect(omniTransaction).toEqual({
                    data: expect.any(String),
                    point,
                    description: `Setting peer for eid ${EndpointId.SOLANA_V2_MAINNET} (SOLANA_V2_MAINNET) to address ${makeBytes32(normalizePeer(point.address, EndpointId.SOLANA_V2_MAINNET))}`,
                })
            })
        })
    })
})
