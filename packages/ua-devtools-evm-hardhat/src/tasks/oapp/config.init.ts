import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_OAPP_CONFIG_INIT } from '@/constants/tasks'
import { formatEid } from '@layerzerolabs/devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { createLogger, pluralizeNoun, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { getEidsByNetworkName, types } from '@layerzerolabs/devtools-evm-hardhat'
import { promptToSelectMultiple } from '@layerzerolabs/io-devtools'
import { OAppOmniGraphHardhat } from '@/oapp'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

interface ConfigFile {
    path: string
    value: OAppOmniGraphHardhat
}

/**
 * This task will initialize a config file based on user input
 * and return an array of `ConfigFile` objects.
 *
 * The return value is an array to support cases where the users would select
 * a combination of mainnet/testnet networks in which case we'll split them into
 * multiple configurations per network stage.
 *
 * @returns {Promise<ConfigFile[]>}
 */
const action: ActionType<TaskArgs> = async ({ logLevel = 'info' }, hre): Promise<ConfigFile[]> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // Now we collect all available networks and their endpoint IDs
    logger.verbose('Collecting network names and endpoint IDs')
    const eidsByNetworkName = getEidsByNetworkName(hre)
    logger.verbose('Collected network names and endpoint IDs')
    logger.debug(`Collected network names and endpoint IDs:\n\n${printJson(eidsByNetworkName)}`)

    // We make sure there is at least one network configured with an endpoint ID
    const configuredNetworkNames = Object.keys(eidsByNetworkName).filter(
        (networkName) => eidsByNetworkName[networkName] != null
    )

    // If there are no configured networks, we exit
    if (configuredNetworkNames.length == 0) {
        logger.warn(`There are no networks configured with 'eid' in your hardhat config, exiting`)

        return []
    }

    // Now we ask the user to select the networks used in the config
    //
    // First we need to compile a list of options to show to the user
    // (we will include the networks that have not been configured, but will disable them)
    const networkOptions = Object.entries(eidsByNetworkName)
        .map(([networkName, eid]) => ({
            title: networkName,
            value: networkName,
            disabled: eid == null,
            description: eid == null ? undefined : `Connected to ${formatEid(eid)}`,
        }))
        .sort(
            (a, b) =>
                // We want to show the enabled networks first
                Number(a.disabled) - Number(b.disabled) ||
                //  And sort the rest by their name
                a.title.localeCompare(b.title)
        )

    const selectedNetworks = await promptToSelectMultiple(`Select the networks to include in your OApp config`, {
        options: networkOptions,
        disabledHint: `This network does not have 'eid' configured`,
    })

    logger.verbose(
        pluralizeNoun(
            selectedNetworks.length,
            `Selected 1 network: ${selectedNetworks}`,
            `Selected ${selectedNetworks.length} networks: ${selectedNetworks.join(', ')}`
        )
    )

    return []
}

if (process.env.LZ_ENABLE_EXPERIMENTAL_TASK_LZ_OAPP_CONFIG_INIT) {
    task(TASK_LZ_OAPP_CONFIG_INIT, 'Initialize an OApp configuration file')
        .addParam('oappConfig', 'Path to the new LayerZero OApp config', './layerzero.config', types.string)
        .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
        .addParam(
            'ci',
            'Continuous integration (non-interactive) mode. Will not ask for any input from the user',
            false,
            types.boolean
        )
        .setAction(action)
}
