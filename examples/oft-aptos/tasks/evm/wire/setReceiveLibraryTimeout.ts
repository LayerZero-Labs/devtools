import { Contract, utils } from 'ethers'

import { ZEROADDRESS_EVM, diffPrinter } from '../../shared/utils'

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

        const fromReceiveLibraryParam = await getReceiveLibraryTimeout(contract.epv2, address.oapp, nonEvmOapp.eid)
        const fromReceiveLibrary = fromReceiveLibraryParam.lib
        const fromReceiveLibraryExpiry = Number(fromReceiveLibraryParam.expiry)

        const toReceiveLibrary = utils.getAddress(configOapp.receiveLibraryTimeoutConfig.lib)
        const toReceiveLibraryExpiry = Number(configOapp.receiveLibraryTimeoutConfig.expiry)

        if (fromReceiveLibrary === toReceiveLibrary && fromReceiveLibraryExpiry === toReceiveLibraryExpiry) {
            console.log(
                `\x1b[43m Skipping: The same Receive Library and Timeout has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }

        diffPrinter(
            `Setting Receive Library on ${eid}`,
            { lib: fromReceiveLibrary, expiry: fromReceiveLibraryExpiry },
            { lib: toReceiveLibrary, expiry: toReceiveLibraryExpiry }
        )

        const tx = await contract.epv2.populateTransaction.setReceiveLibraryTimeout(
            address.oapp,
            nonEvmOapp.eid,
            toReceiveLibrary,
            toReceiveLibraryExpiry
        )

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

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
