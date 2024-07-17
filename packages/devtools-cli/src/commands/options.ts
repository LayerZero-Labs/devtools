import { LogLevel, isLogLevel } from '@layerzerolabs/io-devtools'
import { InvalidOptionArgumentError, Option } from 'commander'

export interface WithSetupOption {
    setup: string
}

export const createSetupFileOption = () => new Option('-s,--setup <path>', 'Path to a setup file').makeOptionMandatory()

export interface WithLogLevelOption {
    logLevel: LogLevel
}

export const createLogLevelOption = () =>
    new Option('-l,--log-level <level>', 'Logging level. One of: error, warn, info, verbose, debug, silly')
        .default('info')
        .argParser((value) => {
            if (!isLogLevel(value)) {
                throw new InvalidOptionArgumentError(`Invalid log level value: ${value}`)
            }

            return value
        })

export interface WithTsConfigOption {
    tsConfig?: string
}

export const createTsConfigFileOption = () =>
    new Option('--ts-config <path>', 'Path to TypeScript config file (tsconfig.json)').default('tsconfig.json')
