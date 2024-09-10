import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'

import { OmniCounter } from '../../src/omnicounter'
import endpointIdl from '../../target/idl/endpoint.json'
import omniCounterIdl from '../../target/idl/omnicounter.json'

describe('OmniCounter', () => {
    const provider = anchor.AnchorProvider.local(undefined, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
    })
    const connection = provider.connection
    const wallet = provider.wallet as anchor.Wallet
    const OMNICOUNTER_PROGRAM_ID = new PublicKey(omniCounterIdl.metadata.address)
    const ENDPOINT_PROGRAM_ID = new PublicKey(endpointIdl.metadata.address)

    it('should initialize an OmniCounter', async () => {
        const counter = new OmniCounter(OMNICOUNTER_PROGRAM_ID)
        const endpoint = new EndpointProgram.Endpoint(ENDPOINT_PROGRAM_ID)

        const initInstruction = await counter.initCount(connection, wallet.publicKey, wallet.publicKey, endpoint)

        if (initInstruction === null) {
            throw new Error('initInstruction is null')
        }

        await provider.sendAndConfirm(new anchor.web3.Transaction().add(initInstruction), [wallet.payer])

        const count = await counter.getCount(connection)

        expect(count?.count.toString()).toBe('0')
    })
})
