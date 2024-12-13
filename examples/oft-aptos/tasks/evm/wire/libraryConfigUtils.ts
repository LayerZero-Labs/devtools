import { Contract, utils, PopulatedTransaction } from 'ethers'
import { Uln302UlnUserConfig, Uln302ExecutorConfig } from '@layerzerolabs/toolbox-hardhat'
import { returnChecksums, returnChecksum } from '../utils/types'
import type { SetConfigParam, address, eid } from '../utils/types'

export async function getConfig(
    epv2Contract: Contract,
    evmAddress: address,
    libraryAddress: address,
    aptosEid: eid,
    configType: number
): Promise<string> {
    const config = await epv2Contract.getConfig(evmAddress, libraryAddress, aptosEid, configType)
    // const toDecode: SetConfigParam = {
    //     eid: aptosEid,
    //     configType: configType,
    //     config: config,
    // }
    // decodeConfig([toDecode])
    return config
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
    ulnConfig: Uln302UlnUserConfig,
    executorConfig: Uln302ExecutorConfig = null
): { executorConfigBytes: string; ulnConfigBytes: string } {
    const _optionalDVNs = returnChecksums(ulnConfig.optionalDVNs)
    const _requiredDVNs = returnChecksums(ulnConfig.requiredDVNs)

    const ulnConfigBytes = utils.defaultAbiCoder.encode(
        [
            'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ],
        [
            {
                confirmations: ulnConfig.confirmations,
                requiredDVNCount: _requiredDVNs.length,
                optionalDVNCount: _optionalDVNs.length,
                optionalDVNThreshold: ulnConfig.optionalDVNThreshold,
                requiredDVNs: _requiredDVNs.sort(),
                optionalDVNs: _optionalDVNs.sort(),
            },
        ]
    )

    if (executorConfig !== null) {
        const _executor = returnChecksum(executorConfig.executor)
        const executorConfigBytes = utils.defaultAbiCoder.encode(
            ['uint32', 'address'],
            [executorConfig.maxMessageSize, _executor]
        )

        return { executorConfigBytes, ulnConfigBytes }
    }
    return { executorConfigBytes: '0x', ulnConfigBytes }
}

export function decodeConfig(configParam: SetConfigParam[]) {
    const decodedConfig = {
        executorConfig: null,
        ulnConfig: null,
    }
    try {
        for (const { configType, config } of configParam) {
            if (configType === 1) {
                const decoded = utils.defaultAbiCoder.decode(['uint32', 'address'], config)
                decodedConfig.executorConfig = {
                    maxMessageSize: decoded[0],
                    executor: decoded[1],
                }
            } else if (configType === 2) {
                const decoded = utils.defaultAbiCoder.decode(
                    [
                        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
                    ],
                    config
                )
                decodedConfig['ulnConfig'] = {
                    confirmations: decoded[0]['confirmations'],
                    requiredDVNCount: decoded[0]['requiredDVNCount'],
                    optionalDVNCount: decoded[0]['optionalDVNCount'],
                    requiredDVNs: decoded[0]['requiredDVNs'],
                    optionalDVNs: decoded[0]['optionalDVNs'],
                    optionalDVNThreshold: decoded[0]['optionalDVNThreshold'],
                }
            }
        }
    } catch (e) {
        console.log(decodeConfig)
        return
    }

    return decodedConfig
}
