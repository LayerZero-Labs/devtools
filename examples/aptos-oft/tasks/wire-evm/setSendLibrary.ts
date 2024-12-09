import { AptosOFTMetadata, ContractMetadataMapping, eid, EidTxMap, ZEROADDRESS } from '../utils/types'
import { diffPrinter } from '../utils/utils'
import { Contract, utils } from 'ethers'

const error_LZ_DefaultSendLibUnavailable = '0x6c1ccdb5'

/**
 * @author Shankar
 * @notice Generates setSendLibrary transaction per Eid's OFT.
 * @dev Fetches the current sendLibrary from EndpointV2
 * @dev Sets the new sendLibrary on the EndpointV2.
 * @returns EidTxMap
 */
export async function createSetSendLibraryTransactions(
    eidDataMapping: ContractMetadataMapping,
    aptosOft: AptosOFTMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.sendLibrary === undefined) {
            console.log(`\x1b[43m Skipping: No sendLibrary has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        const fromSendLibrary = await getSendLibrary(contract.epv2, address.oapp, aptosOft.eid)

        const toSendLibrary = utils.getAddress(configOapp.sendLibrary)

        if (fromSendLibrary === toSendLibrary) {
            console.log(`\x1b[43m Skipping: The same send library has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Send Library on ${eid}`, { sendLibrary: fromSendLibrary }, { sendLibrary: toSendLibrary })

        const tx = await contract.epv2.populateTransaction.setSendLibrary(address.oapp, aptosOft.eid, toSendLibrary)

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getSendLibrary(epv2Contract: Contract, evmAddress: string, aptosEid: eid): Promise<string> {
    const sendLib = await epv2Contract.getSendLibrary(evmAddress, aptosEid)

    if (sendLib === error_LZ_DefaultSendLibUnavailable) {
        return ZEROADDRESS
    }

    const sendLibAddress = utils.getAddress(sendLib)

    return sendLibAddress
}
