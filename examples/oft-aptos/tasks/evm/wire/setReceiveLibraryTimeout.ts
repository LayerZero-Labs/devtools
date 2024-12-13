import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { ZEROADDRESS_EVM } from '../utils/types'

import type {
    ContractMetadataMapping,
    EidTxMap,
    NonEvmOAppMetadata,
    RecvLibraryTimeoutConfig,
    eid,
} from '../utils/types'

/**
 * @notice Generates setReceiveLibraryTimeout transaction per Eid's OFT.
 * @dev Fetches the current receiveLibraryTimeout from EndpointV2
 * @dev Sets the new receiveLibraryTimeout on the EndpointV2.
 * @returns EidTxMap
 */
export async function createSetReceiveLibraryTimeoutTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.receiveLibraryTimeoutConfig === undefined) {
            console.log(
                `\x1b[43m Skipping: No Receive Library Timeout has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }

        const currReceiveLibraryParam = await getReceiveLibraryTimeout(contract.epv2, address.oapp, nonEvmOapp.eid)
        const currReceiveLibrary = currReceiveLibraryParam.lib
        const currReceiveLibraryExpiry = Number(currReceiveLibraryParam.expiry)

        const newReceiveLibrary = utils.getAddress(configOapp.receiveLibraryTimeoutConfig.lib)
        const newReceiveLibraryExpiry = Number(configOapp.receiveLibraryTimeoutConfig.expiry)

        if (currReceiveLibrary === newReceiveLibrary && currReceiveLibraryExpiry === newReceiveLibraryExpiry) {
            console.log(
                `\x1b[43m Skipping: The same Receive Library and Timeout has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }

        diffPrinter(
            `Setting Receive Library on ${eid}`,
            { lib: currReceiveLibrary, expiry: currReceiveLibraryExpiry },
            { lib: newReceiveLibrary, expiry: newReceiveLibraryExpiry }
        )

        const tx = await contract.epv2.populateTransaction.setReceiveLibraryTimeout(
            address.oapp,
            nonEvmOapp.eid,
            newReceiveLibrary,
            newReceiveLibraryExpiry
        )

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getReceiveLibraryTimeout(
    epv2Contract: Contract,
    evmAddress: string,
    aptosEid: eid
): Promise<RecvLibraryTimeoutConfig> {
    const recvLibTimeoutParam: RecvLibraryTimeoutConfig = await epv2Contract.receiveLibraryTimeout(evmAddress, aptosEid)

    const recvLib = recvLibTimeoutParam.lib

    if (recvLib === ZEROADDRESS_EVM) {
        return {
            lib: ZEROADDRESS_EVM,
            expiry: BigInt(0),
        }
    }

    return recvLibTimeoutParam
}
