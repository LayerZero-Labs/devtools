import { Contract, PopulatedTransaction, utils, constants } from 'ethers'

import { Uln302ExecutorConfig, Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'

import { returnChecksum, returnChecksums } from './types'

import type { SetConfigParam, address, eid } from './types'

const DEFAULT_CONFIG_MESSAGE = `${constants.AddressZero} - DEFAULT`

// A value used to indicate that no DVNs are required. It has to be used instead of 0, because 0 falls back to default value.
const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max = 255

export async function getConfig(
    epv2Contract: Contract,
    evmAddress: address,
    libraryAddress: address,
    aptosEid: eid,
    configType: number,
    isSendConfig: boolean
): Promise<string> {
    let isDefault: boolean = false

    if (isSendConfig) {
        isDefault = await epv2Contract.isDefaultSendLibrary(evmAddress, aptosEid)
    } else {
        const receiveConfig = await epv2Contract.getReceiveLibrary(evmAddress, aptosEid)
        isDefault = receiveConfig.isDefault
    }

    if (isDefault) {
        return DEFAULT_CONFIG_MESSAGE
    }

    const config = await epv2Contract.getConfig(evmAddress, libraryAddress, aptosEid, configType)

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
    executorConfig: Uln302ExecutorConfig | null = null
): { executorConfigBytes: string; ulnConfigBytes: string } {
    if (!ulnConfig.optionalDVNs) {
        ulnConfig.optionalDVNs = []
    }
    const _optionalDVNs = returnChecksums(ulnConfig.optionalDVNs)
    const _requiredDVNs = returnChecksums(ulnConfig.requiredDVNs)

    const ulnConfigBytes = utils.defaultAbiCoder.encode(
        [
            'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ],
        [
            {
                confirmations: ulnConfig.confirmations,
                requiredDVNCount: _requiredDVNs.length > 0 ? _requiredDVNs.length : NIL_DVN_COUNT,
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
    const decodedConfig: {
        executorConfig: Uln302ExecutorConfig
        ulnConfig: Uln302UlnUserConfig
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = {} as any
    try {
        for (const { configType, config } of configParam) {
            if (configType === 1) {
                if (config === DEFAULT_CONFIG_MESSAGE) {
                    decodedConfig.executorConfig = {
                        maxMessageSize: 0,
                        executor: constants.AddressZero,
                    }
                    continue
                }

                const decoded = utils.defaultAbiCoder.decode(['uint32', 'address'], config)
                decodedConfig.executorConfig = {
                    maxMessageSize: decoded[0],
                    executor: decoded[1],
                }
            } else if (configType === 2) {
                if (config === DEFAULT_CONFIG_MESSAGE) {
                    decodedConfig.ulnConfig = {
                        confirmations: BigInt(0),
                        requiredDVNs: [],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    }
                    continue
                }

                const decoded = utils.defaultAbiCoder.decode(
                    [
                        'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
                    ],
                    config
                )

                decodedConfig.ulnConfig = {
                    confirmations: BigInt(decoded[0]['confirmations']),
                    requiredDVNs: decoded[0]['requiredDVNs'],
                    optionalDVNs: decoded[0]['optionalDVNs'],
                    optionalDVNThreshold: decoded[0]['optionalDVNThreshold'],
                }
            }
        }
    } catch (e) {
        throw new Error('unable to decode config')
    }

    return decodedConfig
}
