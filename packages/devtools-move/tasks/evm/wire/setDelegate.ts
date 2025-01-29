import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import { createDiffMessage, printAlreadySet, printNotSet, logPathwayHeader } from '../../shared/messageBuilder'

import type { OmniContractMetadataMapping, EidTxMap } from '../utils/types'

/**
 * @notice Sets delegate for a contract.
 * @dev Fetches the current delegate from EndpointV2
 * @dev Sets the new delegate on the OApp
 * @returns EidTxMap
 */
export async function createSetDelegateTransactions(eidDataMapping: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}
    logPathwayHeader('setDelegate')
    for (const [eid, { peers, address, contract, configAccount }] of Object.entries(eidDataMapping)) {
        const peerToEid = peers[0].eid
        const currDelegate = await getDelegate(contract.epv2, address.oapp)

        if (!configAccount?.delegate) {
            printNotSet('delegate - not found in config', Number(eid), Number(eid))
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
        txTypePool[eid].push({
            toEid: peerToEid,
            populatedTx: tx,
        })
    }

    return txTypePool
}

export async function getDelegate(epv2Contract: Contract, oappAddress: string) {
    const delegate = await epv2Contract.delegates(oappAddress)
    const delegateAddress = utils.getAddress(delegate)

    return delegateAddress
}
