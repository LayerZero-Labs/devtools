import { Contract, PopulatedTransaction, utils } from 'ethers'

import type { SetConfigParam, address, eid } from '../shared/types'
import type { OAppSendConfig } from '@layerzerolabs/toolbox-hardhat'

/**
 * @author Shankar
 * @returns EidTxMap
 */

export async function getConfig(
    epv2Contract: Contract,
    evmAddress: address,
    libraryAddress: address,
    aptosEid: eid,
    configType: number
): Promise<string> {
    const sendLib = await epv2Contract.getConfig(evmAddress, libraryAddress, aptosEid, configType)

    return sendLib
}

export function setConfig(
    epv2Contract: Contract,
    evmAddress: address,
    libraryAddress: address,
    config: SetConfigParam[]
): Promise<PopulatedTransaction> {
    return epv2Contract.populateTransaction.setConfig(evmAddress, libraryAddress, config)
}

export function buildConfig(
    ulnConfig: OAppSendConfig['ulnConfig'],
    executorConfig: OAppSendConfig['executorConfig'] = null
): { executorConfigBytes: string; ulnConfigBytes: string } {
    const ulnConfigBytes = utils.defaultAbiCoder.encode(
        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
        [
            Number(ulnConfig.confirmations),
            ulnConfig.requiredDVNs.length,
            ulnConfig.optionalDVNs.length,
            ulnConfig.optionalDVNThreshold,
            ulnConfig.requiredDVNs.sort(),
            ulnConfig.optionalDVNs.sort(),
        ]
    )
    if (executorConfig !== null) {
        const executorConfigBytes = utils.defaultAbiCoder.encode(
            ['uint32', 'address'],
            [executorConfig.maxMessageSize, executorConfig.executor]
        )

        return { executorConfigBytes, ulnConfigBytes }
    }

    return { executorConfigBytes: '0x', ulnConfigBytes }
}

export function decodeConfig(configParam: SetConfigParam[]) {
    const decodedConfig = {}
    try {
        for (const { configType, config } of configParam) {
            if (configType === 1) {
                const decoded = utils.defaultAbiCoder.decode(['uint32', 'address'], config)
                decodedConfig['executorConfig'] = {
                    maxMessageSize: decoded[0],
                    executor: decoded[1],
                }
            } else if (configType === 2) {
                const decoded = utils.defaultAbiCoder.decode(
                    ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                    config
                )
                decodedConfig['ulnConfig'] = {
                    confirmations: decoded[0],
                    requiredDVNs: decoded[4],
                    optionalDVNs: decoded[5],
                    optionalDVNThreshold: decoded[3],
                }
            }
        }
    } catch (e) {
        console.log(decodeConfig)
        return
    }

    console.log(decodedConfig)
}
