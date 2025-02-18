import '@/type-extensions'

import { TASK_LZ_TEST_SIMULATION_LOGS, TASK_LZ_TEST_SIMULATION_START } from '@/constants'
import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { LogLevel, createLogger, isFile, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { types } from '@/cli'
import { resolveSimulationConfig } from '@/simulation/config'
import { join } from 'path'
import { spawnSync } from 'child_process'

export interface SimulationLogsTaskArgs {
    logLevel?: LogLevel
    follow?: boolean
}

const action: ActionType<SimulationLogsTaskArgs> = async ({ logLevel = 'info', follow = false }, hre) => {
    setDefaultLogLevel(logLevel)

    printLogo()

    const logger = createLogger()

    // Grab the simulation user config from hardhat user config
    const simulationUserConfig = hre.userConfig.layerZero?.experimental?.simulation ?? {}
    logger.verbose(`Using simulation user config:\n${printJson(simulationUserConfig)}`)

    // Resolve the defaults for the simulation config
    const simulationConfig = resolveSimulationConfig(simulationUserConfig, hre.config)
    logger.verbose(`Resolved simulation config:\n${printJson(simulationConfig)}`)

    // Check that the docker compose file exists
    const dockerComposePath = join(simulationConfig.directory, 'docker-compose.yaml')
    if (!isFile(dockerComposePath)) {
        logger.warn(`Could not find simulation docker compose file '${dockerComposePath}'`)
        logger.warn(`Did you run 'npx hardhat ${TASK_LZ_TEST_SIMULATION_START}'?`)

        process.exitCode = 1

        return
    }

    // Spawn docker compose logs command, piping the stdout and stderr to the current shell
    //
    // The error reporting on this part should be improved - we should check that "docker" and "docker compose"
    // are known commands before we go ahead and try executing them
    try {
        logger.verbose(`Spawning docker compose logs command for ${dockerComposePath}`)

        const command = ['compose', '-f', dockerComposePath, 'logs', ...(follow ? ['--follow'] : [])]

        spawnSync('docker', command, { stdio: 'inherit' })
    } catch (error) {
        logger.error(`Failed to spawn docker compose logs command for ${dockerComposePath}: ${error}`)

        process.exitCode = 1

        return
    }
}

if (process.env.LZ_ENABLE_EXPERIMENTAL_SIMULATION) {
    task(TASK_LZ_TEST_SIMULATION_LOGS, 'Show logs for LayerZero omnichain simulation', action)
        .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
        .addFlag('follow', 'Follow log output')
}
