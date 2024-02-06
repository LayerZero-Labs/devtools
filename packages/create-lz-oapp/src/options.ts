import { InvalidOptionArgumentError, Option } from 'commander'
import { AVAILABLE_PACKAGE_MANAGERS, EXAMPLES } from './config'
import { LogLevel, isDirectory, isFile } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'

export const packageManagerOption = new Option('-p,--package-manager <name>', 'Node package manager to use')
    .choices(AVAILABLE_PACKAGE_MANAGERS.map(({ id }) => id))
    .argParser((id) => {
        const manager = AVAILABLE_PACKAGE_MANAGERS.find((p) => p.id === id)
        if (manager == null) {
            throw new InvalidOptionArgumentError(`Package manager ${id} not found`)
        }

        return manager
    })

export const exampleOption = new Option('-e,--example <name>', 'Example project')
    .choices(EXAMPLES.map(({ id }) => id))
    .argParser((id) => {
        const example = EXAMPLES.find((e) => e.id === id)
        if (example == null) {
            throw new InvalidOptionArgumentError(`Example ${id} not found`)
        }

        return example
    })

export const destinationOption = new Option('-d,--destination <path>', 'Project directory').argParser((destination) => {
    if (isDirectory(destination)) {
        throw new InvalidOptionArgumentError(`Directory '${resolve(destination)}' already exists`)
    }

    if (isFile(destination)) {
        throw new InvalidOptionArgumentError(`File '${resolve(destination)}' already exists`)
    }

    return destination
})

export const ciOption = new Option('--ci', 'Run in CI (non-interactive) mode').default(false)

export const logLevelOption = new Option('--log-level <level>', 'Log level')
    .choices([
        LogLevel.error,
        LogLevel.warn,
        LogLevel.info,
        LogLevel.http,
        LogLevel.verbose,
        LogLevel.debug,
        LogLevel.silly,
    ])
    .default(LogLevel.info)
