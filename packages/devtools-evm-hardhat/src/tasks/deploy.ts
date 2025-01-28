import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { TASK_LZ_DEPLOY } from '@/constants/tasks'
import {
    PromptOption,
    createLogger,
    pluralizeNoun,
    printBoolean,
    promptToContinue,
    promptToSelectMultiple,
    setDefaultLogLevel,
} from '@layerzerolabs/io-devtools'

import { createProgressBar, printLogo, printRecords, render } from '@layerzerolabs/io-devtools/swag'
import { formatEid } from '@layerzerolabs/devtools'
import { getEidsByNetworkName, getHreByNetworkName } from '@/runtime'
import { types } from '@/cli'
import { promptForText } from '@layerzerolabs/io-devtools'
import { Deployment } from 'hardhat-deploy/dist/types'
import { assertDefinedNetworks, assertHardhatDeploy } from '@/internal/assertions'
import { splitCommaSeparated } from '@layerzerolabs/devtools'
import { isDeepEqual } from '@layerzerolabs/devtools'
import { Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

interface TaskArgs {
    networks?: string[]
    stage?: Stage
    tags?: string[]
    logLevel?: string
    ci?: boolean
    reset?: boolean
}

/**
 * Result of this task, a map of `NetworkDeployResult` objects keyed by network names
 *
 * @see {@link NetworkDeployResult}
 */
type DeployResults = Record<string, NetworkDeployResult>

/**
 * Result of a deployment for one particular network.
 *
 * Unfortunately, when deployment fails partially,
 * there is now way of getting the partial deployment result from hardhat-deploy
 * and just an error is returned instead
 */
type NetworkDeployResult =
    // A successful result will contain a map of deployments by their contract names
    | {
          contracts: Record<string, Deployment>
          error?: never
      }
    // A failed result will only contain an error
    | {
          contracts?: never
          error: unknown
      }

const action: ActionType<TaskArgs> = async (
    { networks: networksArgument, tags: tagsArgument = [], logLevel = 'info', ci = false, reset = false, stage },
    hre
): Promise<DeployResults> => {
    printLogo()

    // Make sure to check that the networks are defined
    assertDefinedNetworks(networksArgument ?? [])

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // We only want to be asking users for input if we are not in interactive mode
    const isInteractive = !ci
    logger.debug(isInteractive ? 'Running in interactive mode' : 'Running in non-interactive (CI) mode')
    logger.debug(reset ? 'Will delete existing deployments' : 'Will not delete existing deployments')

    // The first thing to do is to ensure that the project is compiled
    try {
        logger.info(`Compiling your hardhat project`)

        await hre.run(TASK_COMPILE)
    } catch (error) {
        logger.warn(`Failed to compile the project: ${error}`)
    }

    // --stage cannot be used in conjunction with --networks
    if (networksArgument != null && stage != null) {
        logger.error(`--stage ${stage} cannot be used in conjunction with --networks ${networksArgument.join(',')}`)

        process.exit(1)
    }

    // We grab a mapping between network names and endpoint IDs
    const eidsByNetworks = Object.entries(getEidsByNetworkName())
    // If a stage argument is passed, we'll filter out the networks for that stage
    const filteredEidsByNetworks =
        stage == null
            ? eidsByNetworks
            : eidsByNetworks.filter(([, eid]) => eid != null && endpointIdToStage(eid) === stage)
    const configuredNetworkNames = filteredEidsByNetworks.flatMap(([name, eid]) => (eid == null ? [] : [name]))

    // We'll use all the configured network names as the default for the networks argument
    const networks: string[] = networksArgument ?? configuredNetworkNames

    // Here we'll store the final value for the networks we'd like to deploy
    let selectedNetworks: string[]

    let selectedTags: string[]

    if (isInteractive) {
        // In the interactive mode, we'll ask the user to confirm which networks they want to deploy

        // We'll preselect the networks passed as --networks argument and we'll do it in O(1)
        const networksSet = new Set(networks)

        const options: PromptOption<string>[] = eidsByNetworks
            .map(([networkName, eid]) => ({
                title: networkName,
                value: networkName,
                disabled: eid == null,
                selected: networksSet.has(networkName),
                hint: eid == null ? undefined : `Connected to ${formatEid(eid)}`,
            }))
            .sort(
                (a, b) =>
                    // We want to show the enabled networks first
                    Number(a.disabled) - Number(b.disabled) ||
                    //  And sort the rest by their name
                    a.title.localeCompare(b.title)
            )

        // Now we ask the user to confirm the network selection
        selectedNetworks = await promptToSelectMultiple('Which networks would you like to deploy?', { options })

        // And we ask to confirm the tags to deploy
        selectedTags = await promptForText('Which deploy script tags would you like to use?', {
            defaultValue: tagsArgument?.join(','),
            hint: 'Leave empty to use all deploy scripts',
        }).then(splitCommaSeparated)
    } else {
        // In the non-interactive mode we'll use whatever we got on the CLI
        selectedNetworks = networks
        selectedTags = tagsArgument
    }

    // If no networks have been selected, we exit
    if (selectedNetworks.length === 0) {
        return logger.warn(`No networks selected, exiting`), {}
    }

    // We'll tell the user what's about to happen
    logger.info(
        pluralizeNoun(
            selectedNetworks.length,
            `Will deploy 1 network: ${selectedNetworks.join(',')}`,
            `Will deploy ${selectedNetworks.length} networks: ${selectedNetworks.join(', ')}`
        )
    )

    if (selectedTags.length === 0) {
        // Deploying all tags might not be what the user wants so we'll warn them about it
        logger.warn(`Will use all deployment scripts`)
    } else {
        logger.info(`Will use deploy scripts tagged with ${selectedTags.join(', ')}`)
    }

    // Now we confirm with the user that they want to continue
    const shouldDeploy = isInteractive ? await promptToContinue() : true
    if (!shouldDeploy) {
        return logger.verbose(`User cancelled the operation, exiting`), {}
    }

    // We talk we talk we talk
    logger.verbose(`Running deployment scripts`)

    // Now we render a progressbar to monitor the deployment progress
    const progressBar = render(createProgressBar({ before: 'Deploying... ', after: ` 0/${selectedNetworks.length}` }))

    // For now we'll use a very simple deployment logic with no retries
    //
    // For display purposes, we'll track the number of networks we deployed
    let numProcessed: number = 0

    // And for display purposes we'll also track the failures
    const results: DeployResults = {}

    // Now we run all the deployments
    await Promise.all(
        selectedNetworks.map(async (networkName) => {
            // First we grab the hre for that network
            const env = await getHreByNetworkName(networkName)

            try {
                // We need to make sure the user has enabled hardhat-deploy
                assertHardhatDeploy(env)

                // We first collect all existing deployments
                //
                // We do this so that we can diff the state before and after
                // running the deployment scripts.
                //
                // This is, in immediate effect, a workaround for having to set resetMemory
                // in the options for the run() function below to false. In near future though
                // it opens doors for being able to return partially successful deployment results
                const deploymentsBefore = await env.deployments.all()

                // The core of this task, running the hardhat deploy scripts
                const deploymentsAfter = await env.deployments.run(selectedTags, {
                    // If we don't pass resetmemory or set it to true,
                    // hardhat deploy will erase the database of deployments
                    // (including the external deployments)
                    //
                    // In effect this means the deployments for LayerZero artifacts would not be available
                    resetMemory: false,
                    writeDeploymentsToFiles: true,
                    deletePreviousDeployments: reset,
                })

                // Now we do a little diff on what contracts had been changed
                const contracts = Object.fromEntries(
                    Object.entries(deploymentsAfter).filter(
                        ([name]) => !isDeepEqual(deploymentsBefore[name], deploymentsAfter[name])
                    )
                )

                results[networkName] = { contracts }

                logger.debug(`Successfully deployed network ${networkName}`)
            } catch (error: unknown) {
                // If we fail to deploy, we just store the error and continue
                //
                // Unfortunately, there is no way of knowing whether the failure was total
                // or partial so we don't know whether there are any contracts that got deployed
                results[networkName] = { error }

                logger.debug(`Failed deploying network ${networkName}: ${error}`)
            } finally {
                numProcessed++

                // Now we update the progressbar
                progressBar.rerender(
                    createProgressBar({
                        before: 'Deploying... ',
                        after: ` ${numProcessed}/${selectedNetworks.length}`,
                        progress: numProcessed / selectedNetworks.length,
                    })
                )
            }
        })
    )

    // We drop the progressbar and continue
    progressBar.clear()

    // We check whether we got any errors
    const errors = Object.entries(results).flatMap(([networkName, { error }]) =>
        error == null ? [] : [{ networkName, error }]
    )

    // If nothing went wrong we just exit
    if (errors.length === 0) {
        return logger.info(`${printBoolean(true)} Your contracts are now deployed`), results
    }

    // We log the fact that there were some errors
    logger.error(
        `${printBoolean(false)} ${pluralizeNoun(errors.length, 'Failed to deploy 1 network', `Failed to deploy ${errors.length} networks`)}`
    )

    // If some of the deployments failed, we let the user know
    const previewErrors = isInteractive ? await promptToContinue(`Would you like to see the deployment errors?`) : true
    if (previewErrors) {
        printRecords(
            errors.map(({ networkName, error }) => ({
                Network: networkName,
                Error: String(error),
            }))
        )
    }

    // Mark the process as unsuccessful (only if it has not yet been marked as such)
    process.exitCode = process.exitCode || 1

    return results
}

task(TASK_LZ_DEPLOY, 'Deploy LayerZero contracts', action)
    .addParam(
        'networks',
        'List of comma-separated networks. If not provided, all networks will be deployed',
        undefined,
        types.csv,
        true
    )
    .addParam(
        'tags',
        'List of comma-separated deploy script tags to deploy. If not provided, all deploy scripts will be executed',
        undefined,
        types.csv,
        true
    )
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('stage', 'Chain stage. One of: mainnet, testnet, sandbox', undefined, types.stage, true)
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addFlag('reset', 'Delete existing deployments')
