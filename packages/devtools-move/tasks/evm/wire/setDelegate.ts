import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'

import type { OmniContractMetadataMapping, EidTxMap } from '../utils/types'

/**
 * @notice Sets delegate for a contract.
 * @dev Fetches the current delegate from EndpointV2
 * @dev Sets the new delegate on the OApp
 * @returns EidTxMap
 */
export async function createSetDelegateTransactions(eidDataMapping: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configAccount }] of Object.entries(eidDataMapping)) {
        const currDelegate = await getDelegate(contract.epv2, address.oapp)

        if (!configAccount?.delegate) {
            printNotSet('delegate', Number(eid), Number(eid))
            continue
        }

        const newDelegate = utils.getAddress(configAccount.delegate)

        if (currDelegate === newDelegate) {
            printAlreadySet('delegate', Number(eid), Number(eid))
            continue
        }

        const diffMessage = createDiffMessage('delegate', Number(eid), Number(eid))
        diffPrinter(diffMessage, { delegate: currDelegate }, { delegate: newDelegate })

        const tx = await contract.oapp.populateTransaction.setDelegate(newDelegate)

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
