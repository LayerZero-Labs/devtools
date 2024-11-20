import { OmniSignerTON, serializeMessageRelaxed } from '@/transactions'
import { OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { internal, WalletContractV3R2, WalletContractV4 } from '@ton/ton'
import { mnemonicToWalletKey } from '@ton/crypto'

describe('transactions/signer', () => {
    const endpoint = process.env.NETWORK_URL_TON || 'http://localhost:8081/jsonRPC'
    const mnemonic =
        process.env.MNEMONIC_TON ||
        'spoon key tower goat diesel labor camera movie chaos entry panic ceiling panel move sibling genius grunt rival buzz just velvet medal butter foam'

    describe('OmniSignerTON', () => {
        describe('signAndSend', () => {
            it('should send a token transfer', async () => {
                const eid = EndpointId.TRON_SANDBOX
                const keyPair = await mnemonicToWalletKey(mnemonic.split(' '))
                const signer = new OmniSignerTON(
                    EndpointId.TRON_SANDBOX,
                    keyPair,
                    endpoint,
                    WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey, walletId: 42 })
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
