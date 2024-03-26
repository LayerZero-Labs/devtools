import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP } from '@/constants/tasks'
import {
    createLogger,
    setDefaultLogLevel,
    printJson,
    pluralizeNoun,
    createConfigLoader,
} from '@layerzerolabs/io-devtools'
import { OwnableOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    types,
    SUBTASK_LZ_SIGN_AND_SEND,
    createConnectedContractFactory,
    createSignerFactory,
} from '@layerzerolabs/devtools-evm-hardhat'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'
import { type SignAndSendResult } from '@layerzerolabs/devtools'
import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'
import { OwnableOmniGraphHardhatSchema } from '@/ownable'
import { configureOwnable } from '@layerzerolabs/ua-devtools'
import { createOAppFactory, createOwnableFactory } from '@layerzerolabs/ua-devtools-evm'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
}

const action: ActionType<TaskArgs> = async (
    { oappConfig: oappConfigPath, logLevel = 'info', ci = false },
    hre
): Promise<SignAndSendResult> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    const graph: OwnableOmniGraph = await validateAndTransformOappConfig(
        oappConfigPath,
        createConfigLoader(OwnableOmniGraphHardhatSchema),
        logger
    )

    // At this point we are ready to create the list of transactions
    logger.verbose(`Creating a list of ownerhip transferring transactions`)

    const createSdk = createOwnableFactory(createOAppFactory(createConnectedContractFactory()))
    const transactions = await configureOwnable(graph, createSdk)

    // Flood users with debug output
    logger.verbose(`Created a list of ownerhip transferring transactions`)
    logger.debug(`Following transactions are necessary:\n\n${printJson(transactions)}`)

    // If there are no transactions that need to be executed, we'll just exit
    if (transactions.length === 0) {
        logger.info(`The ownership is correct, no action is necessary`)

        return [[], [], []]
    }

    // Tell the user about the transactions
    logger.info(
        pluralizeNoun(
            transactions.length,
            `There is 1 transaction required to transfer the ownership`,
            `There are ${transactions.length} transactions required to transfer the ownership`
        )
    )
    // Now sign & send the transactions
    const signAndSendResult: SignAndSendResult = await hre.run(SUBTASK_LZ_SIGN_AND_SEND, {
        transactions,
        ci,
        createSigner: createSignerFactory(),
    } satisfies SignAndSendTaskArgs)

    // Mark the process as unsuccessful if there were any errors (only if it has not yet been marked as such)
    const [, failed] = signAndSendResult
    if (failed.length !== 0) {
        process.exitCode = process.exitCode || 1
    }

    return signAndSendResult
}

task(TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP, 'Transfer ownable contract ownership', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
