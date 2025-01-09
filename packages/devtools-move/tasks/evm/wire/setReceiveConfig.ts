import { diffPrinter } from '../../shared/utils'
import { buildConfig, decodeConfig, getConfig, setConfig } from '../utils/libraryConfigUtils'

import { parseReceiveLibrary } from './setReceiveLibrary'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, SetConfigParam } from '../utils/types'

/**
 * @returns EidTxMap
 */
export async function createSetReceiveConfigTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (!configOapp?.receiveConfig?.ulnConfig) {
            console.log(
                `\x1b[43m Skipping: Connections do not have a valid receive config for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }

        const ulnConfig = configOapp.receiveConfig.ulnConfig

        const currReceiveLibrary = await parseReceiveLibrary(
            configOapp?.receiveLibraryConfig,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        const currReceiveConfig = {
            ulnConfigBytes: '',
        }

        currReceiveConfig.ulnConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            currReceiveLibrary.currReceiveLibrary,
            nonEvmOapp.eid,
            2
        )

        const newReceiveConfig = buildConfig(ulnConfig)

        let diffFromOptions: string | undefined
        let diffToOptions: string | undefined

        const setFromConfigParam: SetConfigParam[] = []
        const setToConfigParam: SetConfigParam[] = []

        if (currReceiveConfig.ulnConfigBytes === newReceiveConfig.ulnConfigBytes) {
            console.log(
                `\x1b[43m Skipping: The same uln receive library config has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
        } else {
            diffFromOptions = currReceiveConfig.ulnConfigBytes
            diffToOptions = newReceiveConfig.ulnConfigBytes

            setFromConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 2,
                config: diffFromOptions,
            })

            setToConfigParam.push({
                eid: nonEvmOapp.eid,
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
            diffPrinter(`Setting Receive Config on ${eid}`, decodedSetFromConfigParam, decodedSetToConfigParam)
        }

        const tx = await setConfig(contract.epv2, address.oapp, currReceiveLibrary.currReceiveLibrary, setToConfigParam)

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}
