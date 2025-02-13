import { diffPrinter } from '../../shared/utils'
import { buildConfig, decodeConfig, getConfig, setConfig } from '../utils/libraryConfigUtils'

import { parseSendLibrary } from './setSendLibrary'

import { createDiffMessage, printAlreadySet, printNotSet, logPathwayHeader } from '../../shared/messageBuilder'

import type { OmniContractMetadataMapping, EidTxMap, SetConfigParam } from '../utils/types'

/**
 * @author Shankar
 * @returns EidTxMap
 */
export async function createSetSendConfigTransactions(eidDataMapping: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}
    logPathwayHeader('setSendConfig')
    for (const [eid, { peers, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const peer of peers) {
            const { eid: peerToEid } = peer
            if (configOapp?.sendConfig?.ulnConfig === undefined) {
                printNotSet('send config - not found in config', Number(eid), Number(peerToEid))
                continue
            }
            const ulnConfig = configOapp.sendConfig.ulnConfig
            const executorConfig = configOapp.sendConfig.executorConfig

            const currSendLibrary = await parseSendLibrary(
                configOapp?.sendLibrary,
                contract.epv2,
                address.oapp,
                peerToEid
            )
            if (currSendLibrary.newSendLibrary === '') {
                currSendLibrary.newSendLibrary = currSendLibrary.currSendLibrary
            }

            const currSendConfig = {
                executorConfigBytes: '',
                ulnConfigBytes: '',
            }

            currSendConfig.executorConfigBytes = await getConfig(
                contract.epv2,
                address.oapp,
                currSendLibrary.currSendLibrary,
                peerToEid,
                1,
                true
            )

            currSendConfig.ulnConfigBytes = await getConfig(
                contract.epv2,
                address.oapp,
                currSendLibrary.currSendLibrary,
                peerToEid,
                2,
                true
            )

            const newSendConfig = buildConfig(ulnConfig, executorConfig)

            const diffFromOptions: Record<number, string> = {}
            const diffToOptions: Record<number, string> = {}
            const setConfigParam: SetConfigParam[] = []

            if (currSendConfig.executorConfigBytes === newSendConfig.executorConfigBytes) {
                printAlreadySet('send config - executor', Number(eid), Number(peerToEid))
            } else {
                diffFromOptions[1] = currSendConfig.executorConfigBytes
                diffToOptions[1] = newSendConfig.executorConfigBytes

                setConfigParam.push({
                    eid: peerToEid,
                    configType: 1,
                    config: newSendConfig.executorConfigBytes,
                })
            }

            if (currSendConfig.ulnConfigBytes === newSendConfig.ulnConfigBytes) {
                printAlreadySet('send config - uln', Number(eid), Number(peerToEid))
            } else {
                diffFromOptions[2] = currSendConfig.ulnConfigBytes
                diffToOptions[2] = newSendConfig.ulnConfigBytes

                setConfigParam.push({
                    eid: peerToEid,
                    configType: 2,
                    config: newSendConfig.ulnConfigBytes,
                })
            }

            if (setConfigParam.length === 0) {
                continue
            }

            const currSendConfigParam: SetConfigParam[] = []
            currSendConfigParam.push({
                eid: peerToEid,
                configType: 1,
                config: currSendConfig.executorConfigBytes,
            })
            currSendConfigParam.push({
                eid: peerToEid,
                configType: 2,
                config: currSendConfig.ulnConfigBytes,
            })

            const decodedCurrSendConfigParam = decodeConfig(currSendConfigParam)
            const decodedSetConfigParam = decodeConfig(setConfigParam)

            // they are null because of some reason fix this and it should just work
            if (decodedCurrSendConfigParam && decodedSetConfigParam) {
                if (decodedCurrSendConfigParam !== decodedSetConfigParam) {
                    diffPrinter(
                        createDiffMessage(
                            `send config @ ${currSendLibrary.newSendLibrary}`,
                            Number(eid),
                            Number(peerToEid)
                        ),
                        decodedCurrSendConfigParam,
                        decodedSetConfigParam
                    )
                }
            }

            const tx = await setConfig(contract.epv2, address.oapp, currSendLibrary.newSendLibrary, setConfigParam)

            txTypePool[eid] = txTypePool[eid] ?? []
            txTypePool[eid].push({
                toEid: peerToEid,
                populatedTx: tx,
            })
        }
    }

    return txTypePool
}
