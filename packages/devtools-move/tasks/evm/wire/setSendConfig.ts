import { diffPrinter } from '../../shared/utils'
import { buildConfig, decodeConfig, getConfig, setConfig } from '../utils/libraryConfigUtils'

import { parseSendLibrary } from './setSendLibrary'

import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, SetConfigParam } from '../utils/types'

/**
 * @author Shankar
 * @returns EidTxMap
 */
export async function createSetSendConfigTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.sendConfig?.ulnConfig === undefined) {
            printNotSet('send config', Number(eid), Number(nonEvmOapp.eid))
            continue
        }
        const ulnConfig = configOapp.sendConfig.ulnConfig
        const executorConfig = configOapp.sendConfig.executorConfig

        const currSendLibrary = await parseSendLibrary(
            configOapp?.sendLibrary,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        const currSendConfig = {
            executorConfigBytes: '',
            ulnConfigBytes: '',
        }

        currSendConfig.executorConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            currSendLibrary.currSendLibrary,
            nonEvmOapp.eid,
            1
        )

        currSendConfig.ulnConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            currSendLibrary.currSendLibrary,
            nonEvmOapp.eid,
            2
        )

        const newSendConfig = buildConfig(ulnConfig, executorConfig)

        const diffFromOptions: Record<number, string> = {}
        const diffToOptions: Record<number, string> = {}
        const setConfigParam: SetConfigParam[] = []

        if (currSendConfig.executorConfigBytes === newSendConfig.executorConfigBytes) {
            printAlreadySet('send config', Number(eid), Number(nonEvmOapp.eid))
        } else {
            diffFromOptions[1] = currSendConfig.executorConfigBytes
            diffToOptions[1] = newSendConfig.executorConfigBytes

            setConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 1,
                config: newSendConfig.executorConfigBytes,
            })
        }

        if (currSendConfig.ulnConfigBytes === newSendConfig.ulnConfigBytes) {
            printAlreadySet('send config', Number(nonEvmOapp.eid), Number(eid))
        } else {
            diffFromOptions[2] = currSendConfig.ulnConfigBytes
            diffToOptions[2] = newSendConfig.ulnConfigBytes

            setConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 2,
                config: newSendConfig.ulnConfigBytes,
            })
        }

        if (setConfigParam.length === 0) {
            continue
        }

        const currSendConfigParam: SetConfigParam[] = []
        currSendConfigParam.push({
            eid: nonEvmOapp.eid,
            configType: 1,
            config: currSendConfig.executorConfigBytes,
        })
        currSendConfigParam.push({
            eid: nonEvmOapp.eid,
            configType: 2,
            config: currSendConfig.ulnConfigBytes,
        })

        const decodedSetConfigParam = decodeConfig(setConfigParam)
        const decodedCurrSendConfigParam = decodeConfig(currSendConfigParam)

        if (decodedCurrSendConfigParam && decodedSetConfigParam) {
            diffPrinter(
                createDiffMessage('send config', Number(eid), Number(nonEvmOapp.eid)),
                decodedCurrSendConfigParam,
                decodedSetConfigParam
            )
        }

        const tx = await setConfig(contract.epv2, address.oapp, currSendLibrary.currSendLibrary, setConfigParam)

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}
