import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-devtools'
import { TASK_LZ_OAPP_CONFIG_GET_EXECUTOR } from '@/constants'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import {
    assertDefinedNetworks,
    createOmniPointHardhatTransformer,
    createProviderFactory,
    getEidForNetworkName,
    getEidsByNetworkName,
    types,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createExecutorFactory } from '@layerzerolabs/protocol-devtools-evm'
import { printLogo } from '@layerzerolabs/io-devtools/swag'

interface TaskArgs {
    logLevel?: string
    networks?: string[]
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', networks: networksArgument }, hre) => {
    printLogo()
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const networks = networksArgument
        ? // Here we need to check whether the networks have been defined in hardhat config
          assertDefinedNetworks(networksArgument)
        : //  But here a=we are taking them from hardhat config so no assertion is necessary
          Object.entries(getEidsByNetworkName(hre)).flatMap(([networkName, eid]) => (eid == null ? [] : [networkName]))

    const pointTransformer = createOmniPointHardhatTransformer()
    const executorFactory = createExecutorFactory(createProviderFactory())

    const configs: Record<string, Record<string, unknown>> = {}
    for (const localNetworkName of networks) {
        const localEid = getEidForNetworkName(localNetworkName)

        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) {
                continue
            }

            const remoteEid = getEidForNetworkName(remoteNetworkName)

            const executorOmniPoint = await pointTransformer({ eid: localEid, contractName: 'Executor' })
            const executor = await executorFactory(executorOmniPoint)
            const executorDstConfig = await executor.getDstConfig(remoteEid)

            configs[localNetworkName] = {
                ...configs[localNetworkName],
                [remoteNetworkName]: executorDstConfig,
            }

            console.log(
                printRecord({
                    localNetworkName,
                    remoteNetworkName,
                    executorDstConfig,
                })
            )
        }
    }
    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET_EXECUTOR,
    'Outputs the Executors destination configurations including the native max cap amount',
    action
)
    .addParam('networks', 'Comma-separated list of networks', undefined, types.csv, true)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
