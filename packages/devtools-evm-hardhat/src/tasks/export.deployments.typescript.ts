import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_EXPORT_DEPLOYMENTS_TYPESCRIPT } from '@/constants/tasks'
import { OutputFile, createIncludeDirent, generate, generatorTypeScript } from '@layerzerolabs/export-deployments'
import { createLogger, pluralizeNoun, printBoolean, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { types } from '@/cli'

interface TaskArgs {
    contracts?: string[]
    networks?: string[]
    outDir?: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async (
    { networks, contracts, logLevel = 'info', outDir = 'generated' },
    hre
): Promise<OutputFile[]> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // We just go ahead and export, not a care in the world
    const results = generate({
        // Since we are in a hardhat project, the deployments path is coming from the config
        deploymentsDir: hre.config.paths.deployments,
        outDir,
        includeDeploymentFile: createIncludeDirent(contracts),
        includeNetworkDir: createIncludeDirent(networks),
        generator: generatorTypeScript,
    })

    logger.info(
        `${printBoolean(true)} ${pluralizeNoun(results.length, `Generated 1 file:`, `Generated ${results.length} files`)}`
    )

    for (const { path } of results) {
        logger.info(`\t${path}`)
    }

    return results
}

task(TASK_LZ_EXPORT_DEPLOYMENTS_TYPESCRIPT, 'Export deployments as TypeScript files', action)
    .addParam(
        'networks',
        'List of comma-separated networks. If not provided, all networks will be deployed',
        undefined,
        types.csv,
        true
    )
    .addParam(
        'contracts',
        'List of comma-separated contract names. If not provided, all contracts will be exported',
        undefined,
        types.csv,
        true
    )
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
