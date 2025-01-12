import { diffPrinter } from '../../shared/utils'
import { buildConfig, decodeConfig, getConfig, setConfig } from '../utils/libraryConfigUtils'

import { parseReceiveLibrary } from './setReceiveLibrary'

import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'

import type { OmniContractMetadataMapping, EidTxMap, SetConfigParam } from '../utils/types'

/**
 * @returns EidTxMap
 */
export async function createSetReceiveConfigTransactions(
    eidDataMapping: OmniContractMetadataMapping
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { wireOntoOapps, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const wireOntoOapp of wireOntoOapps) {
            const { eid: peerToEid } = wireOntoOapp
            if (!configOapp?.receiveConfig?.ulnConfig) {
                printNotSet('receive config', Number(eid), Number(peerToEid))
                continue
            }

            const ulnConfig = configOapp.receiveConfig.ulnConfig

            const currReceiveLibrary = await parseReceiveLibrary(
                configOapp?.receiveLibraryConfig,
                contract.epv2,
                address.oapp,
                peerToEid
            )

            const currReceiveConfig = {
                ulnConfigBytes: '',
            }

            currReceiveConfig.ulnConfigBytes = await getConfig(
                contract.epv2,
                address.oapp,
                currReceiveLibrary.currReceiveLibrary,
                peerToEid,
                2,
                false
            )

            const newReceiveConfig = buildConfig(ulnConfig)

            let diffFromOptions: string | undefined
            let diffToOptions: string | undefined

            const setFromConfigParam: SetConfigParam[] = []
            const setToConfigParam: SetConfigParam[] = []

            if (currReceiveConfig.ulnConfigBytes === newReceiveConfig.ulnConfigBytes) {
                printAlreadySet('receive config', Number(eid), Number(peerToEid))
            } else {
                diffFromOptions = currReceiveConfig.ulnConfigBytes
                diffToOptions = newReceiveConfig.ulnConfigBytes

                setFromConfigParam.push({
                    eid: peerToEid,
                    configType: 2,
                    config: diffFromOptions,
                })

                setToConfigParam.push({
                    eid: peerToEid,
                    configType: 2,
                    config: diffToOptions,
                })
            }

            if (setFromConfigParam.length === 0) {
                continue
            }

            const decodedSetFromConfigParam = decodeConfig(setFromConfigParam)
            const decodedSetToConfigParam = decodeConfig(setToConfigParam)

            if (decodedSetFromConfigParam && decodedSetToConfigParam) {
                diffPrinter(
                    createDiffMessage('receive config', Number(eid), Number(peerToEid)),
                    decodedSetFromConfigParam,
                    decodedSetToConfigParam
                )
            }

            const tx = await setConfig(
                contract.epv2,
                address.oapp,
                currReceiveLibrary.newReceiveLibrary,
                setToConfigParam
            )

            txTypePool[eid] = txTypePool[eid] ?? []
            txTypePool[eid].push(tx)
        }
    }

    return txTypePool
}
