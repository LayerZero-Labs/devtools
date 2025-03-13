import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, SUBTASK_LZ_OAPP_WIRE_CONFIGURE, TASK_LZ_OAPP_WIRE } from '@/constants/tasks'
import { createLogger, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    types,
    SUBTASK_LZ_SIGN_AND_SEND,
    createGnosisSignerFactory,
    createSignerFactory,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createWireFlow } from '@layerzerolabs/devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import type { SignAndSendResult } from '@layerzerolabs/devtools'

import type { SignerDefinition } from '@layerzerolabs/devtools-evm'
import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

import type { SubtaskConfigureTaskArgs, SubtaskLoadConfigTaskArgs } from '@/tasks/oapp/types'
import { OAppOmniGraphHardhatSchema } from '@/oapp'
import { writeFileSync } from 'fs'

import './subtask.configure'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
    dryRun?: boolean
    assert?: boolean
    safe?: boolean
    signer?: SignerDefinition
    /**
     * Name of a custom config loading subtask
     *
     * This can be useful in situations where a single project
     * requires multiple custom configurations with their own config validation schemas
     */
    loadConfigSubtask?: string
    /**
     * Name of a custom configuration subtask
     *
     * This can be useful in situations where a single project
     * requires multiple custom configurations with their own configurators
     */
    configureSubtask?: string
    /**
     * Name of a custom sign & send subtask
     *
     * This can be useful in situations where a completely sifferent signing logic is required
     */
    signAndSendSubtask?: string
    /**
     * Output filename for the generated transactions.
     */
    outputFilename?: string
    /**
     * Exclude connections that originate from the specified EndpointIds.
     */
    skipConnectionsFromEids?: string[]
}

const action: ActionType<TaskArgs> = async (
    {
        oappConfig: oappConfigPath,
        logLevel = 'info',
        ci = false,
        dryRun = false,
        assert = false,
        safe = false,
        signer,
        loadConfigSubtask = SUBTASK_LZ_OAPP_CONFIG_LOAD,
        configureSubtask = SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
        signAndSendSubtask = SUBTASK_LZ_SIGN_AND_SEND,
        outputFilename,
        skipConnectionsFromEids,
    },
    hre
): Promise<SignAndSendResult> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // Now we can load and validate the config
    //
    // To maintain compatibility with the legacy hardhat-based CLI,
    // we use a subtask to do this
    logger.debug(`Using ${loadConfigSubtask} subtask to load the config`)
    const graph: OAppOmniGraph = await hre.run(loadConfigSubtask, {
        configPath: oappConfigPath,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_WIRE,
    } satisfies SubtaskLoadConfigTaskArgs)

    // Now let's create the signer
    logger.debug(
        signer == null ? `Creating a default signer` : `Creating a signer based on definition: ${printJson(signer)}`
    )
    const createSigner = safe ? createGnosisSignerFactory(signer) : createSignerFactory(signer)

    // Then create the wire flow
    const wireFlow = createWireFlow({
        logger,
        // We use hardhat subtasks to provide the option to override certain behaviors on a more granular level
        executeConfig: ({ graph }) => hre.run(configureSubtask, { graph } satisfies SubtaskConfigureTaskArgs),
        signAndSend: ({ transactions }) => {
            if (outputFilename) {
                logger.debug(`Writing transactions to ${outputFilename}`)
                writeFileSync(outputFilename, JSON.stringify(transactions, null, 2))
            }
            return hre.run(signAndSendSubtask, {
                ci,
                logger,
                createSigner,
                transactions,
            } satisfies SignAndSendTaskArgs)
        },
    })

    // And run the wire flow
    return wireFlow({
        graph,
        assert,
        dryRun,
        skipConnectionsFromEids,
    })
}

task(TASK_LZ_OAPP_WIRE, 'Wire LayerZero OApp', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam(
        'loadConfigSubtask',
        'Override the default config loading subtask',
        SUBTASK_LZ_OAPP_CONFIG_LOAD,
        types.string,
        true
    )
    .addParam(
        'configureSubtask',
        'Override the default configuration subtask',
        SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
        types.string,
        true
    )
    .addParam(
        'signAndSendSubtask',
        'Override the default sign & send subtask',
        SUBTASK_LZ_SIGN_AND_SEND,
        types.string,
        true
    )
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addFlag('dryRun', 'Will not execute any transactions')
    .addFlag(
        'assert',
        'Will not execute any transactions and fail if there are any transactions required to configure the OApp'
    )
    .addFlag('safe', 'Use gnosis safe to sign transactions')
    .addParam('signer', 'Index or address of signer', undefined, types.signer, true)
    .addParam('outputFilename', 'Output filename for the generated transactions', undefined, types.string, true)
    .addOptionalParam(
        'skipConnectionsFromEids',
        'Skip wiring connections that originate from the specified EndpointIds',
        undefined,
        types.csv
    )
