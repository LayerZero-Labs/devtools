import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { TASK_LZ_ERRORS_DECODE } from '@/constants/tasks'
import { createErrorParser, types } from '@layerzerolabs/devtools-evm-hardhat'
import { RevertError } from '@layerzerolabs/devtools-evm'
import { printLogo, printRecord } from '@layerzerolabs/io-devtools/swag'
import { CustomError } from '@layerzerolabs/devtools-evm'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { ContractError } from '@layerzerolabs/devtools-evm'
import { PanicError } from '@layerzerolabs/devtools-evm'

interface TaskArgs {
    hash: string
    logLevel?: string
}

export const action: ActionType<TaskArgs> = async ({ hash, logLevel = 'info' }, hre): Promise<ContractError> => {
    // You knew this was going to happen
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const logger = createLogger(logLevel)

    // The first thing to do is to ensure that the project is compiled
    try {
        logger.info(`Compiling your hardhat project`)

        await hre.run(TASK_COMPILE)
    } catch (error) {
        logger.warn(`Failed to compile the project: ${error}`)
    }

    // We create an error parser
    //
    // Since this parser in its natural habitat needs an OmniPoint
    // (it is used to parse OmniErrors), we need to create a mock OmniPoint
    const errorParser = await createErrorParser()

    // Now we decode all the data we received on the CLI
    const error = errorParser({ data: hash })

    logger.verbose(`Got an error: ${error}`)

    // And print out the result for the user
    switch (true) {
        case error instanceof CustomError:
            printRecord({
                Type: 'Custom error',
                Error: String(error),
            })

            break

        case error instanceof PanicError:
            printRecord({
                Type: 'Panic error',
                Error: String(error),
            })

            break

        case error instanceof RevertError:
            printRecord({
                Type: 'Revert error',
                Error: String(error),
            })

            break

        default:
            logger.warn(`Failed to parse the error`)
            break
    }

    return error
}

task(TASK_LZ_ERRORS_DECODE, 'Decodes custom error data based', action)
    .addPositionalParam('hash', 'Encoded contract error hash (including the 0x prefix)', undefined, types.string, false)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
