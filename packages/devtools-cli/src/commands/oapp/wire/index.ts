import { Command } from 'commander'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import {
    type WithLogLevelOption,
    type WithSetupOption,
    WithTsConfigOption,
    createLogLevelOption,
    createSetupFileOption,
    createTsConfigFileOption,
} from '@/commands/options'
import { setupTypescript } from '@/setup'

interface Args extends WithLogLevelOption, WithSetupOption, WithTsConfigOption {}

export const wire = new Command('wire')
    .addOption(createSetupFileOption())
    .addOption(createTsConfigFileOption())
    .addOption(createLogLevelOption())
    .action(async ({ setup, logLevel, tsConfig: tsConfigPath }: Args) => {
        printLogo()

        // We'll set the global logging level to get as much info as needed
        setDefaultLogLevel(logLevel)

        // We'll setup TypeScript support so that we can dynamically load TypeScript config files
        setupTypescript(tsConfigPath)

        const logger = createLogger(logLevel)

        logger.debug(`Loading setup from ${setup}`)

        logger.warn(
            `This command is just a placeholder. Please use @layerzerolabs/toolbox-hardhat package for the time being.`
        )
    })
