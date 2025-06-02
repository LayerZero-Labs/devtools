import { Command } from 'commander'
import { printRecords } from '@layerzerolabs/io-devtools/swag'
import {
    createConfigLoader,
    createLogger,
    printBoolean,
    printJson,
    setDefaultLogLevel,
} from '@layerzerolabs/io-devtools'
import { configureOApp, OAppOmniGraphSchema } from '@layerzerolabs/ua-devtools'
import {
    WithAssertFlag,
    WithDryRunFlag,
    type WithLogLevelOption,
    WithOAppConfigOption,
    type WithSetupOption,
    WithTsConfigOption,
    createAssertFlag,
    createDryRunFlag,
    createLogLevelOption,
    createOAppConfigFileOption,
    createSetupFileOption,
    createTsConfigFileOption,
} from '@/commands/options'
import { createSetupLoader, setupTypeScript } from '@/setup'
import { Configurator, formatOmniTransaction, OmniGraph, OmniTransaction } from '@layerzerolabs/devtools'
import { CLISetup } from '@/types'

interface Args
    extends WithLogLevelOption,
        WithSetupOption,
        WithOAppConfigOption,
        WithAssertFlag,
        WithDryRunFlag,
        WithTsConfigOption {}

export const wire = new Command('wire')
    .addOption(createLogLevelOption())
    .addOption(createSetupFileOption())
    .addOption(createOAppConfigFileOption())
    .addOption(createTsConfigFileOption())
    .addOption(createAssertFlag())
    .addOption(createDryRunFlag())
    .action(
        async ({
            setup: setupPath,
            logLevel,
            oappConfig: oappConfigPath,
            assert = false,
            dryRun = false,
            tsConfig: tsConfigPath,
        }: Args) => {
            printLogo()

            // We'll set the global logging level to get as much info as needed
            setDefaultLogLevel(logLevel)

            // We'll setup TypeScript support so that we can dynamically load TypeScript config files
            setupTypeScript(tsConfigPath)

            // We'll need a logger
            const logger = createLogger(logLevel)

            // And since this command is not complete yet, we'll warn the user
            logger.warn(
                `This command is just a placeholder. Please use @layerzerolabs/toolbox-hardhat package for the time being.`
            )

            if (assert) {
                logger.info(`Running in assertion mode`)
            } else if (dryRun) {
                logger.info(`Running in dry run mode`)
            }

            let setup: CLISetup

            // Now it's time to load the setup file tht contains all the bits required to do the wiring
            const loadSetup = createSetupLoader()

            try {
                logger.verbose(`Loading setup from ${setupPath}`)

                setup = await loadSetup(setupPath)

                logger.verbose(`Loaded setup from ${setupPath}`)
            } catch (error) {
                logger.error(`Failed to load setup from ${setupPath}:\n\n${error}`)

                process.exit(1)
            }

            // The first thing we'll need is the graph of our app
            //
            // In order to get the graph, we'll first need some means of loading it.
            // By default, the OApp graph loader will be used but users might choose to supply their own
            // config loader
            logger.verbose(
                setup.loadConfig == null
                    ? `Using default OApp config loader`
                    : `Using custom config loader from ${setupPath}`
            )

            let graph: OmniGraph

            // Now it's time to load the config file
            const loadConfig = setup.loadConfig ?? createConfigLoader(OAppOmniGraphSchema)

            try {
                logger.info(`Loading config file from ${oappConfigPath}`)

                graph = await loadConfig(oappConfigPath)

                logger.info(`${printBoolean(true)} Successfully loaded config file from ${oappConfigPath}`)
                logger.debug(`Loaded config file from ${oappConfigPath}:\n\n${printJson(graph)}`)
            } catch (error) {
                logger.error(`Failed to load config from ${setupPath}:\n\n${error}`)

                process.exit(1)
            }

            // With the setup & config in place, the only missing piece to get the OApp configuration
            // is the configurator that will get the list of transactions needed
            const configure: Configurator<any, any> =
                setup.configure == null
                    ? (logger.verbose(`Using default OApp configurator`), configureOApp)
                    : (logger.verbose(`Using custom configurator from ${setupPath}`), setup.configure)

            let transactions: OmniTransaction[]

            try {
                logger.info(`Checking configuration`)

                transactions = await configure(graph, setup.createSdk)
            } catch (error) {
                logger.error(`Failed to check OApp configuration:\n\n${error}`)

                process.exit(1)
            }

            // If there are no transactions that need to be executed, we'll just exit
            if (transactions.length === 0) {
                return logger.info(`The OApp is wired, no action is necessary`), undefined
            } else if (assert) {
                // If we are in assertion mode, we'll print out the transactions and exit with code 1
                // if there is anything left to configure
                logger.error(`The OApp is not fully wired, following transactions are necessary:`)

                // Print the outstanding transactions
                printRecords(transactions.map(formatOmniTransaction))

                // Exit with non-zero error code
                process.exit(1)
            }

            // If we are in dry run mode, we'll just print the transactions and exit
            if (dryRun) {
                printRecords(transactions.map(formatOmniTransaction))
            }
        }
    )
