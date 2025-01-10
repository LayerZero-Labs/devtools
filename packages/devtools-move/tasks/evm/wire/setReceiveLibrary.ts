import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { ZEROADDRESS_EVM } from '../utils/types'
import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'
import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, RecvLibParam, address, eid } from '../utils/types'
import type { OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

const error_LZ_DefaultReceiveLibUnavailable = '0x78e84d0│'

/**
 * @notice Generates setReceiveLibrary transaction per Eid's OFT.
 * @dev Fetches the current receiveLibrary from EndpointV2
 * @dev Sets the new receiveLibrary on the EndpointV2.
 * @dev The zero address != current default receive library
 * @dev - Zero Address is an abstraction to a variable receive library configurable by LZ.
 * @dev - The "value" of the current default receiveLibrary is a fixed value that is invariant on LZ changing the default receive library.
 * @returns EidTxMap
 */
export async function createSetReceiveLibraryTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.receiveLibraryConfig === undefined) {
            printNotSet('receive library', Number(eid), Number(nonEvmOapp.eid))
            continue
        }

        const { currReceiveLibrary, newReceiveLibrary } = await parseReceiveLibrary(
            configOapp.receiveLibraryConfig,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        if (newReceiveLibrary === '') {
            printNotSet('receive library', Number(eid), Number(nonEvmOapp.eid))
            continue
        }

        if (currReceiveLibrary === newReceiveLibrary) {
            printAlreadySet('receive library', Number(eid), Number(nonEvmOapp.eid))
            continue
        }
        const receiveLibraryGracePeriod = configOapp.receiveLibraryConfig.gracePeriod

        diffPrinter(
            createDiffMessage('receive library', Number(eid), Number(nonEvmOapp.eid)),
            { receiveLibrary: currReceiveLibrary },
            { receiveLibrary: newReceiveLibrary }
        )

        const tx = await contract.epv2.populateTransaction.setReceiveLibrary(
            address.oapp,
            nonEvmOapp.eid,
            newReceiveLibrary,
            receiveLibraryGracePeriod
        )

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function parseReceiveLibrary(
    receiveLib: OAppEdgeConfig['receiveLibraryConfig'] | undefined,
    epv2: Contract,
    oappAddress: address,
    eid: eid
): Promise<{ currReceiveLibrary: string; newReceiveLibrary: string }> {
    if (receiveLib === undefined || receiveLib.receiveLibrary === undefined) {
        const currReceiveLibrary = await getDefaultReceiveLibrary(epv2, oappAddress, eid)

        return {
            currReceiveLibrary,
            newReceiveLibrary: '',
        }
    }

    const currReceiveLibrary = await getReceiveLibrary(epv2, oappAddress, eid)

    const newReceiveLibrary = utils.getAddress(receiveLib.receiveLibrary)

    return { currReceiveLibrary, newReceiveLibrary }
}

export async function getReceiveLibrary(epv2Contract: Contract, evmAddress: string, aptosEid: eid): Promise<string> {
    const recvLibParam: RecvLibParam = await epv2Contract.getReceiveLibrary(evmAddress, aptosEid)
    const recvLib = recvLibParam.lib

    if (recvLib === error_LZ_DefaultReceiveLibUnavailable) {
        return ZEROADDRESS_EVM
    }

    const recvLibAddress = utils.getAddress(recvLib)

    return recvLibAddress
}

export async function getDefaultReceiveLibrary(
    epv2Contract: Contract,
    evmAddress: string,
    aptosEid: eid
): Promise<string> {
    const recvLib = await epv2Contract.getDefaultReceiveLibrary(evmAddress, aptosEid)

    const sendLibAddress = utils.getAddress(recvLib)

    return sendLibAddress
}
