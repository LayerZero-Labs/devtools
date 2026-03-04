import { Wallet as EthersV6Wallet, TypedDataDomain, TypedDataField } from 'ethers-v6'
import type { Wallet as EthersV5Wallet } from 'ethers'
import type { IHyperliquidSigner } from './interfaces'

/**
 * Signer implementation wrapping ethers.js Wallet
 */
export class EthersSigner implements IHyperliquidSigner {
    private wallet: EthersV6Wallet

    constructor(privateKeyOrWallet: string | EthersV5Wallet) {
        if (typeof privateKeyOrWallet === 'string') {
            // Create from private key string
            this.wallet = new EthersV6Wallet(privateKeyOrWallet)
        } else {
            // Convert ethers v5 wallet to v6
            this.wallet = new EthersV6Wallet(privateKeyOrWallet.privateKey)
        }
    }

    /**
     * Get the address of this signer
     */
    async getAddress(): Promise<string> {
        return this.wallet.address
    }

    /**
     * Sign EIP-712 typed data using ethers.js
     */
    async signTypedData(
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, unknown>
    ): Promise<string> {
        return await this.wallet.signTypedData(domain, types, value)
    }
}
