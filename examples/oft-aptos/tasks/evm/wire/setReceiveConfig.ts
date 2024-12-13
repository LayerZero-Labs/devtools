import { diffPrinter } from '../../shared/utils'
import { parseReceiveLibrary } from './setReceiveLibrary'
import { getConfig, setConfig, buildConfig, decodeConfig } from '../utils/libraryConfigUtils'

import type { NonEvmOAppMetadata, ContractMetadataMapping, EidTxMap, SetConfigParam } from '../utils/types'

/**
 * @returns EidTxMap
 */
export async function createSetReceiveConfigTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (configOapp?.receiveConfig === undefined) {
            console.log(
                `\x1b[43m Skipping: Connections does not have a receive config for ${eid} @ ${address.oapp} \x1b[0m`
            )
            continue
        }
        const ulnConfig = configOapp.receiveConfig.ulnConfig

        const fromReceiveLibrary = await parseReceiveLibrary(
            configOapp?.receiveLibraryConfig,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        const fromReceiveConfig = {
            ulnConfigBytes: '',
        }

        fromReceiveConfig.ulnConfigBytes = await getConfig(
            contract.epv2,
            address.oapp,
            fromReceiveLibrary.fromReceiveLibrary,
            nonEvmOapp.eid,
            2
        )

        const toReceiveConfig = buildConfig(ulnConfig)

        const diffFromOptions: Record<number, string> = {}
        const diffToOptions: Record<number, string> = {}
        const setConfigParam: SetConfigParam[] = []

        if (fromReceiveConfig.ulnConfigBytes === toReceiveConfig.ulnConfigBytes) {
            console.log(
                `\x1b[43m Skipping: The same uln receive library config has been set for ${eid} @ ${address.oapp} \x1b[0m`
            )
        } else {
            diffFromOptions[2] = fromReceiveConfig.ulnConfigBytes
            diffToOptions[2] = toReceiveConfig.ulnConfigBytes

            setConfigParam.push({
                eid: nonEvmOapp.eid,
                configType: 2,
                config: toReceiveConfig.ulnConfigBytes,
            })
        }

        if (setConfigParam.length === 0) {
            continue
        }

        diffPrinter(`Setting Receive Config on ${eid}`, diffFromOptions, diffToOptions)

        const fromReceiveConfigParam: SetConfigParam[] = []
        fromReceiveConfigParam.push({
            eid: nonEvmOapp.eid,
            configType: 2,
            config: fromReceiveConfig.ulnConfigBytes,
        })

        decodeConfig(setConfigParam)

        const tx = await setConfig(contract.epv2, address.oapp, fromReceiveLibrary.fromReceiveLibrary, setConfigParam)

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
}
