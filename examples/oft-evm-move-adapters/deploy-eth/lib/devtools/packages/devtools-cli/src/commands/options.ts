import { LogLevel, isLogLevel } from '@layerzerolabs/io-devtools'
import { InvalidOptionArgumentError, Option } from 'commander'

export interface WithSetupOption {
    setup: string
}

export const createSetupFileOption = () => new Option('-s,--setup <path>', 'Path to a setup file').makeOptionMandatory()

export interface WithOAppConfigOption {
    oappConfig: string
}

export const createOAppConfigFileOption = () =>
    new Option('--oapp-config <path>', 'Path to an OApp config file').makeOptionMandatory()

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

export interface WithAssertFlag {
    assert?: boolean
}

export const createAssertFlag = () =>
    new Option(
        '--assert',
        'Will not execute any transactions and fail if there are any transactions required to configure the OApp'
    )

export interface WithDryRunFlag {
    dryRun?: boolean
}

export const createDryRunFlag = () => new Option('--dry-run', 'Will not execute any transactions')

export interface WithTsConfigOption {
    tsConfig?: string
}

export const createTsConfigFileOption = () =>
    new Option('--ts-config <path>', 'Path to TypeScript config file (tsconfig.json)').default('tsconfig.json')
