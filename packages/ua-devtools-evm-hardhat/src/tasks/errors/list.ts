import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { TASK_LZ_ERRORS_LIST } from '@/constants/tasks'
import { getAllArtifacts, types } from '@layerzerolabs/devtools-evm-hardhat'
import { Fragment } from '@ethersproject/abi'
import { hexDataSlice } from '@ethersproject/bytes'
import { id } from '@ethersproject/hash'
import { printLogo, printVerticalTable } from '@layerzerolabs/io-devtools/swag'
import { isErrorFragment } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface TaskArgs {
    containing?: string
    showSourcePath?: boolean
    logLevel?: string
}

export const action: ActionType<TaskArgs> = async (
    { containing = '', showSourcePath = false, logLevel = 'info' },
    hre
): Promise<void> => {
    // Of course we do
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

    // We get all the artifacts in the project
    const artifacts = await getAllArtifacts(hre)

    // The we format them into table rows
    const rows = artifacts.flatMap((artifact) =>
        artifact.abi
            // First thing we want to do is get only the errors
            .filter(isErrorFragment)
            // And turn them into Fragment objects
            .map(Fragment.from)
            // And create objects suitable for printing
            .map((fragment) => ({
                // We use the format() method to pretty-print the fragment
                Error: fragment.format(),
                // And add the contract name
                Contract: artifact.contractName,
                // The error hash
                Signature: hexDataSlice(id(fragment.format()), 0, 4),
            }))
            // Now we filter out the entries that match the query string from the CLI arguments
            //
            // If this is an empty string, everything will match. If this string is non-empty,
            // only case-sensitive matches are considered
            .filter(({ Error, Signature }) => Error.includes(containing) || Signature?.includes(containing))
            // And if the user asked for source paths too, we show them as well
            //
            // This is an opt-in thing since source paths can be quite long (especially if importing
            // from libraries) and don't look great in narrow CLI consoles
            .map(showSourcePath ? (row) => ({ ...row, Path: artifact.sourceName }) : (row) => row)
    )

    // We'll not print anything if there are no matching errors
    if (rows.length === 0) {
        return logger.warn(`No errors found, exiting`), undefined
    }

    printVerticalTable(rows)
}

task(TASK_LZ_ERRORS_LIST, 'List all custom errors from your project', action)
    .addParam('containing', 'Only show custom errors containing a string', '', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addFlag('showSourcePath', 'Show contract source path')
