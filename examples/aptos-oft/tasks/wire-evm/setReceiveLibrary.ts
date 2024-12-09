import { AptosOFTMetadata, ContractMetadataMapping, eid, EidTxMap, RecvLibParam } from '../utils/types'
import { diffPrinter } from '../utils/utils'
import { Contract, utils } from 'ethers'

const error_LZ_DefaultReceiveLibUnavailable = '0x78e84d0│'

/**
 * @author Shankar
 * @notice Generates setReceiveLibrary transaction per Eid's OFT.
 * @dev Fetches the current receiveLibrary from EndpointV2
 * @dev Sets the new receiveLibrary on the EndpointV2.
 * @returns EidTxMap
 */
export async function createSetReceiveLibraryTransactions(
    eidDataMapping: ContractMetadataMapping,
    aptosOft: AptosOFTMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.receiveLibraryConfig === undefined) {
            console.log(`\x1b[43m Skipping: No Receive Library has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        const fromReceiveLibrary = await getReceiveLibrary(contract.epv2, address.oapp, aptosOft.eid)

        const toReceiveLibrary = utils.getAddress(configOapp.receiveLibraryConfig.receiveLibrary)

        const receiveLibraryGracePeriod = configOapp.receiveLibraryConfig.gracePeriod

        if (fromReceiveLibrary === toReceiveLibrary) {
            console.log(`\x1b[43m Skipping: The same Receive library has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        diffPrinter(
            `Setting Receive Library on ${eid}`,
            { receiveLibrary: fromReceiveLibrary },
            { receiveLibrary: toReceiveLibrary }
        )

        const tx = await contract.epv2.populateTransaction.setReceiveLibrary(
            address.oapp,
            aptosOft.eid,
            toReceiveLibrary,
            receiveLibraryGracePeriod
        )

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getReceiveLibrary(epv2Contract: Contract, evmAddress: string, aptosEid: eid): Promise<string> {
    const recvLibParam: RecvLibParam = await epv2Contract.getReceiveLibrary(evmAddress, aptosEid)
    const recvLib = recvLibParam.lib

    if (recvLib === error_LZ_DefaultReceiveLibUnavailable) {
        return '0x0000000000000000000000000000000000000000'
    }

    const recvLibAddress = utils.getAddress(recvLib)

    return recvLibAddress
}
