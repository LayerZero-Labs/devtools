import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_OAPP_CONFIG_INIT } from '@/constants/tasks'
import { formatEid } from '@layerzerolabs/devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { createLogger, pluralizeNoun, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { getEidsByNetworkName, types } from '@layerzerolabs/devtools-evm-hardhat'
import { promptToSelectMultiple } from '@layerzerolabs/io-devtools'
import {
    createPrinter,
    createSourceFile,
    ListFormat,
    NodeArray,
    ScriptKind,
    ScriptTarget,
    SourceFile,
    Statement,
} from 'typescript'
import { generateLzConfig } from '@/oapp/typescript/typescript'
import { writeFileSync } from 'fs'

interface TaskArgs {
    contractName: string
    oappConfig: string
    logLevel?: string
}

/**
 * This task will initialize a config file based on user input
 *
 * The return value is a file path to the newly generated LayerZero Config file
 *
 * @returns {Promise<string>}
 */
const action: ActionType<TaskArgs> = async ({ contractName, oappConfig, logLevel = 'info' }, hre): Promise<string> => {
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
        throw new Error(`There are no networks configured with 'eid' in your hardhat config, exiting`)
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
            hint: eid == null ? undefined : `Connected to ${formatEid(eid)}`,
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

    const printer = createPrinter()
    const sourceFile: SourceFile = createSourceFile(oappConfig, '', ScriptTarget.ESNext, true, ScriptKind.TS)
    const generatedLzConfig: NodeArray<Statement> = await generateLzConfig(selectedNetworks, contractName)
    const layerZeroConfigContent: string = printer.printList(ListFormat.MultiLine, generatedLzConfig, sourceFile)
    writeFileSync(oappConfig, layerZeroConfigContent)
    return oappConfig
}

task(TASK_LZ_OAPP_CONFIG_INIT, 'Initialize an OApp configuration file', action)
    .addParam('oappConfig', 'Path to the new LayerZero OApp config', undefined, types.string)
    .addParam('contractName', 'Name of contract in deployments folder', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
