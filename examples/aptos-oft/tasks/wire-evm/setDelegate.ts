import { WireEvm, AptosOFTMetadata } from '../types'
import { diffPrinter } from '../utils'
import { PopulatedTransaction, Contract, utils } from 'ethers'
/**
 * Sets peer information for connections to wire.
 */
export async function createSetDelegateTransactions(
    wireFactories: WireEvm[],
    _aptosOft: AptosOFTMetadata
): Promise<PopulatedTransaction[]> {
    const setPeerTxPool = []

    for (const wireFactory of wireFactories) {
        const contract = wireFactory.contract
        const evmAddress = wireFactory.evmAddress
        const eid = wireFactory.fromEid

        const fromDelegate = await getDelegate(contract, evmAddress)
        const toDelegate = wireFactory.configAccount.delegate

        if (fromDelegate === toDelegate && fromDelegate !== '') {
            console.log(`\x1b[43m Skipping: The same delegate has been set for ${eid} @ ${evmAddress} \x1b[0m`)
            setPeerTxPool.push({ data: '', from: '', to: '' })
            continue
        }

        diffPrinter(`Setting Delegate on ${eid}`, { delegate: fromDelegate }, { delegate: toDelegate })

        const tx = await contract.populateTransaction.setDelegate(toDelegate)

        setPeerTxPool.push(tx)
    }

    return setPeerTxPool
}

export async function getDelegate(contract: Contract, evmAddress: string) {
    const endpoint = await contract.endpoint()

    const endpointAbi = ['function delegates(address evmAddress) external view returns (address)']

    const delegate = await contract.provider.call({
        to: endpoint,
        data: new utils.Interface(endpointAbi).encodeFunctionData('delegates', [evmAddress]),
    })
    const delegateAddress = utils.getAddress(`0x${delegate.slice(26)}`)

    return delegateAddress
}
