import { diffPrinter } from '../../shared/utils'

import { parseReceiveLibrary } from './setReceiveLibrary'

import { buildConfig, decodeConfig, getConfig, setConfig } from '../utils/libraryConfigUtils'
import { createDiffMessage, printAlreadySet, printNotSet, logPathwayHeader } from '../../shared/messageBuilder'

import type { OmniContractMetadataMapping, EidTxMap, SetConfigParam } from '../utils/types'

/**
 * @returns EidTxMap
 */
export async function createSetReceiveConfigTransactions(
    eidDataMapping: OmniContractMetadataMapping
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}
    logPathwayHeader('setReceiveConfig')
    for (const [eid, { peers, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const peer of peers) {
            const { eid: peerToEid } = peer
            if (!configOapp?.receiveConfig?.ulnConfig) {
                printNotSet('receive config - not found in config', Number(eid), Number(peerToEid))
                continue
            }

            const ulnConfig = configOapp.receiveConfig.ulnConfig

            const currReceiveLibrary = await parseReceiveLibrary(
                configOapp?.receiveLibraryConfig,
                contract.epv2,
                address.oapp,
                peerToEid
            )
            if (currReceiveLibrary.newReceiveLibrary === '') {
                currReceiveLibrary.newReceiveLibrary = currReceiveLibrary.currReceiveLibrary
            }

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
                printAlreadySet('receive config - uln', Number(eid), Number(peerToEid))
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
                    createDiffMessage(
                        `receive config @ ${currReceiveLibrary.newReceiveLibrary}`,
                        Number(eid),
                        Number(peerToEid)
                    ),
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
            txTypePool[eid].push({
                toEid: peerToEid,
                populatedTx: tx,
            })
        }
    }

    return txTypePool
}
