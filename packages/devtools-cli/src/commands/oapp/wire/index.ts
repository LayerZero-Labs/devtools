import { Command } from 'commander'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { type WithLogLevelOption, type WithSetupOption, createSetupFileOption } from '@/commands/options'

interface Args extends WithLogLevelOption, WithSetupOption {}

export const wire = new Command('wire').addOption(createSetupFileOption()).action(async ({ setup, logLevel }: Args) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const logger = createLogger(logLevel)

    logger.debug(`Loading setup from ${setup}`)

    logger.warn(
        `This command is just a placeholder. Please use @layerzerolabs/toolbox-hardhat package for the time being.`
    )
})
