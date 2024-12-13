import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata } from '../utils/types'

/**
 * @notice Sets delegate for a contract.
 * @dev Fetches the current delegate from EndpointV2
 * @dev Sets the new delegate on the OApp
 * @returns EidTxMap
 */
export async function createSetDelegateTransactions(
    eidDataMapping: ContractMetadataMapping,
    _nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configAccount }] of Object.entries(eidDataMapping)) {
        const currDelegate = await getDelegate(contract.epv2, address.oapp)

        if (!configAccount?.delegate) {
            console.log(`\x1b[43m Skipping: No delegate has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        const newD = utils.getAddress(configAccount.delegate)

        if (currDelegate === newD) {
            console.log(`\x1b[43m Skipping: The same delegate has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Delegate on ${eid}`, { delegate: currDelegate }, { delegate: newD })

        const tx = await contract.oapp.populateTransaction.setDelegate(newD)

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getDelegate(epv2Contract: Contract, oappAddress: string) {
    const delegate = await epv2Contract.delegates(oappAddress)
    const delegateAddress = utils.getAddress(delegate)

    return delegateAddress
}
