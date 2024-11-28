import { WireEvm, AptosOFTMetadata } from '../types'

/**
 * Pre-check balances for the provided contract factories.
 * Ensures sufficient balance for the `setPeer` gas estimation.
 */
export async function preCheckBalances(wireFactories: WireEvm[], aptosOft: AptosOFTMetadata) {
    for (const wireFactory of wireFactories) {
        const signer = wireFactory.signer
        const balance = await signer.getBalance()

        const estimatedGas = await wireFactory.contract.estimateGas.setPeer(30101, aptosOft.aptosAddress)

        if (balance.lt(estimatedGas)) {
            const errMsg = `chain id - ${await signer.getChainId()} @ ${signer.address} `
            console.error(`\x1b[41m Error: Insufficient Signer Balance \x1b[0m ${errMsg}`)
            process.exit(1)
        }
    }
}
