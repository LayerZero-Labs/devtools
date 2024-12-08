import { AptosOFTMetadata, ContractMetadataMapping, EidTxMap } from '../utils/types'
import { diffPrinter } from '../utils/utils'
import { Contract, utils } from 'ethers'

/**
 * Sets peer information for connections to wire.
 */
export async function createSetDelegateTransactions(
    eidDataMapping: ContractMetadataMapping,
    _aptosOft: AptosOFTMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { contract, evmAddress, configAccount }] of Object.entries(eidDataMapping)) {
        const fromDelegate = await getDelegate(contract, evmAddress)

        if (configAccount?.delegate === undefined) {
            console.log(`\x1b[43m Skipping: No delegate has been set for ${eid} @ ${evmAddress} \x1b[0m`)
            continue
        }

        const toDelegate = utils.getAddress(configAccount.delegate)

        if (fromDelegate === toDelegate) {
            console.log(`\x1b[43m Skipping: The same delegate has been set for ${eid} @ ${evmAddress} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Delegate on ${eid}`, { delegate: fromDelegate }, { delegate: toDelegate })

        const tx = await contract.populateTransaction.setDelegate(toDelegate)

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
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
