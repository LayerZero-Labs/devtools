import '@/type-extensions'

import { TASK_LZ_TEST_SIMULATION_LOGS, TASK_LZ_TEST_SIMULATION_START } from '@/constants'
import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { types } from '@/cli'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { LogLevel, createLogger, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { serializeDockerComposeSpec } from '@layerzerolabs/devtools'
import { createSimulationComposeSpec } from '@/simulation/compose'
import { assertDefinedNetworks } from '@/internal/assertions'
import { getEidsByNetworkName } from '@/runtime'
import { getAnvilOptionsFromHardhatNetworks, pickNetworkConfigs, resolveSimulationConfig } from '@/simulation'
import { dockerfile, nginxConf } from '@/simulation/assets'
import { spawnSync } from 'child_process'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

export interface SimulationStartTaskArgs {
    logLevel?: LogLevel
    networks?: string[]
    daemon?: boolean
    stage?: Stage
}

const action: ActionType<SimulationStartTaskArgs> = async (
    { networks: networksArgument, daemon = false, logLevel = 'info', stage },
    hre
) => {
    setDefaultLogLevel(logLevel)

    printLogo()

    const logger = createLogger()

    // --stage cannot be used in conjunction with --networks
    if (networksArgument != null && stage != null) {
        logger.error(`--stage ${stage} cannot be used in conjunction with --networks ${networksArgument.join(',')}`)

        process.exit(1)
    }

    // And we create a filtering predicate for the stage argument
    const isOnStage = stage == null ? () => true : (eid: EndpointId) => endpointIdToStage(eid) === stage

    // Let's grab the networks that will be included in the simulation
    const networks = networksArgument
        ? // Here we need to check whether the networks have been defined in hardhat config
          assertDefinedNetworks(networksArgument)
        : //  But here we are taking them from hardhat config so no assertion is necessary
          Object.entries(getEidsByNetworkName()).flatMap(([networkName, eid]) =>
              eid != null && isOnStage(eid) ? [networkName] : []
          )

    // We only continue if we have any networks with eid
    //
    // The eid is not really a requirement - we could spin up forked nodes for any
    // network defined in the hardhat config - it's just a way of limiting this simulation to LayerZero networks
    if (networks.length === 0) {
        logger.warn(`No networks with eid configured, exiting`)

        return
    }

    logger.info(`Will create a simulation configuration for networks ${networks.join(', ')}`)

    // Grab the simulation user config from hardhat user config
    const simulationUserConfig = hre.userConfig.layerZero?.experimental?.simulation ?? {}
    logger.verbose(`Using simulation user config:\n${printJson(simulationUserConfig)}`)

    // Resolve the defaults for the simulation config
    const simulationConfig = resolveSimulationConfig(simulationUserConfig, hre.config)
    logger.verbose(`Resolved simulation config:\n${printJson(simulationConfig)}`)

    // Grab only the network configs we are going to need for the simulation
    const networkConfigs = pickNetworkConfigs(networks)(hre.config.networks)

    // Turn the network configs into anvil options
    const anvilOptions = getAnvilOptionsFromHardhatNetworks(simulationConfig, networkConfigs)
    logger.verbose(`The anvil config is:\n${printJson(anvilOptions)}`)

    // Now create the compose file
    const composeSpec = createSimulationComposeSpec(simulationConfig, anvilOptions)
    const serializedComposeSpec = serializeDockerComposeSpec(composeSpec)

    // And finally we write all the required file artifacts to filesystem
    logger.verbose(`Making sure directory ${simulationConfig.directory} exists`)
    mkdirSync(simulationConfig.directory, { recursive: true })

    const dockerfilePath = join(simulationConfig.directory, 'Dockerfile')
    logger.debug(`Writing simulation Dockerfile to ${dockerfilePath}`)
    writeFileSync(dockerfilePath, dockerfile)

    const nginxConfPath = join(simulationConfig.directory, 'nginx.conf')
    logger.debug(`Writing simulation nginx configuration file to ${nginxConfPath}`)
    writeFileSync(nginxConfPath, nginxConf)

    const dockerComposePath = join(simulationConfig.directory, 'docker-compose.yaml')
    logger.debug(`Writing simulation docker compose spec file to ${dockerComposePath}`)
    writeFileSync(dockerComposePath, serializedComposeSpec)

    // Spawn docker compose up command, piping the stdout and stderr to the current shell
    //
    // The error reporting on this part should be improved - we should check that "docker" and "docker compose"
    // are known commands before we go ahead and try executing them
    try {
        if (daemon) {
            logger.info(`Starting simulation in the background`)
            logger.info(
                `Use 'LZ_ENABLE_EXPERIMENTAL_SIMULATION=1 npx hardhat ${TASK_LZ_TEST_SIMULATION_LOGS}' to view the network logs`
            )
        } else {
            logger.info(`Starting simulation`)
        }

        logger.verbose(`Spawning docker compose up command for ${dockerComposePath}`)

        // This is a very quick and dirty way to pass an optional --wait argument to docker compose up
        const additionalUpArgs: string[] = daemon ? ['--wait'] : []

        const result = spawnSync('docker', ['compose', '-f', dockerComposePath, 'up', ...additionalUpArgs], {
            stdio: 'inherit',
        })

        if (result.status !== 0) {
            throw new Error(`docker compose up command failed with exit code ${result.status}`)
        }
    } catch (error) {
        logger.error(`Failed to spawn docker compose up command for ${dockerComposePath}: ${error}`)

        process.exitCode = 1

        return
    }
}

if (process.env.LZ_ENABLE_EXPERIMENTAL_SIMULATION) {
    task(TASK_LZ_TEST_SIMULATION_START, 'Start LayzerZero omnichain simulation', action)
        .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
        .addParam('networks', 'Comma-separated list of networks to simulate', undefined, types.csv, true)
        .addParam('stage', 'Chain stage. One of: mainnet, testnet, sandbox', undefined, types.stage, true)
        .addFlag('daemon', 'Start the simulation in the background')
}
