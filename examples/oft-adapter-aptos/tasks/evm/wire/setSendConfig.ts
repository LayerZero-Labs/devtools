import { diffPrinter } from '../../shared/utils'

import { buildConfig, decodeConfig, getConfig, setConfig } from './libraryConfigUtils'
import { parseSendLibrary } from './setSendLibrary'

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
        if (configOapp?.sendConfig === undefined) {
            console.log(
                `\x1b[43m Skipping: Connections does not have a send config for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }
        const ulnConfig = configOapp.sendConfig.ulnConfig
        const executorConfig = configOapp.sendConfig.executorConfig

        const fromSendLibrary = await parseSendLibrary(
            configOapp?.sendLibrary,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        const fromSendConfig = {
            executorConfigBytes: '',
            ulnConfigBytes: '',
        }

        fromSendConfig.executorConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            fromSendLibrary.fromSendLibrary,
            nonEvmOapp.eid,
            1
        )

        fromSendConfig.ulnConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            fromSendLibrary.fromSendLibrary,
            nonEvmOapp.eid,
            2
        )

        const toSendConfig = buildConfig(ulnConfig, executorConfig)

        const diffFromOptions: Record<number, string> = {}
        const diffToOptions: Record<number, string> = {}
        const setConfigParam: SetConfigParam[] = []

        if (fromSendConfig.executorConfigBytes === toSendConfig.executorConfigBytes) {
            console.log(
                `\x1b[43m Skipping: The same executor send library config has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
        } else {
            diffFromOptions[1] = fromSendConfig.executorConfigBytes
            diffToOptions[1] = toSendConfig.executorConfigBytes

            setConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 1,
                config: toSendConfig.executorConfigBytes,
            })
        }

        if (fromSendConfig.ulnConfigBytes === toSendConfig.ulnConfigBytes) {
            console.log(
                `\x1b[43m Skipping: The same uln send library config has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
        } else {
            diffFromOptions[2] = fromSendConfig.ulnConfigBytes
            diffToOptions[2] = toSendConfig.ulnConfigBytes

            setConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 2,
                config: toSendConfig.ulnConfigBytes,
            })
        }

        if (setConfigParam.length === 0) {
            continue
        }

        diffPrinter(`Setting Send Config on ${eid}`, diffFromOptions, diffToOptions)

        const fromSendConfigParam: SetConfigParam[] = []
        fromSendConfigParam.push({
            eid: nonEvmOapp.eid,
            configType: 1,
            config: fromSendConfig.executorConfigBytes,
        })
        fromSendConfigParam.push({
            eid: nonEvmOapp.eid,
            configType: 2,
            config: fromSendConfig.ulnConfigBytes,
        })

        // decodeConfig(fromSendConfigParam)
        decodeConfig(setConfigParam)

        const tx = await setConfig(contract.epv2, address.oapp, fromSendLibrary.fromSendLibrary, setConfigParam)

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
}
