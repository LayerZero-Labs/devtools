import { OmniSignerTON, serializeMessageRelaxed } from '@/transactions'
import { OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { internal, TonClient, WalletContractV3R2, WalletContractV4 } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'

// skipped due to non-determinism and very often random failures (5/10 runs)
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('transactions/signer', () => {
    const endpoint = process.env.NETWORK_URL_TON || 'http://localhost:8081/jsonRPC'
    const mnemonic =
        process.env.MNEMONIC_TON ||
        'spoon key tower goat diesel labor camera movie chaos entry panic ceiling panel move sibling genius grunt rival buzz just velvet medal butter foam'
    const client = new TonClient({ endpoint })

    describe('OmniSignerTON', () => {
        describe('signAndSend', () => {
            it('should send a token transfer', async () => {
                const eid = EndpointId.TON_V2_SANDBOX
                const keyPair = await mnemonicToWalletKey(mnemonic.split(' '))
                const signer = new OmniSignerTON(
                    EndpointId.TON_V2_SANDBOX,
                    keyPair,
                    WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey, walletId: 42 }),
                    client
                )

                const anotherWallet = WalletContractV4.create({
                    workchain: 0,
                    publicKey: keyPair.publicKey,
                    walletId: 7,
                })

                const omniTransaction: OmniTransaction = {
                    point: { eid, address: '0x0' },
                    data: serializeMessageRelaxed(
                        internal({
                            value: 1n,
                            to: anotherWallet.address,
                            bounce: false,
                        })
                    ),
                }

                const response = await signer.signAndSend(omniTransaction)
                expect(response).toMatchObject({
                    transactionHash: expect.any(String),
                    wait: expect.any(Function),
                })

                const receipt = await response.wait()
                expect(receipt).toEqual({ transactionHash: response.transactionHash })
            })
        })
    })
})
