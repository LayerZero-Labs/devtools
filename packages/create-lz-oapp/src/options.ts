import { InvalidOptionArgumentError, Option } from 'commander'
import { getAvailablePackageManagers } from './config'
import { LogLevel, isDirectory, isFile } from '@layerzerolabs/io-devtools'
import { resolve } from 'path'
import type { Example } from './types'

export const createPackageManagerOption = (packageManagers = getAvailablePackageManagers()) =>
    new Option('-p,--package-manager <name>', 'Node package manager to use')
        .choices(packageManagers.map(({ id }) => id))
        .argParser((id) => {
            const manager = packageManagers.find((p) => p.id === id)
            if (manager == null) {
                throw new InvalidOptionArgumentError(`Package manager ${id} not found`)
            }

            return manager
        })

export const createExampleOption = (examples: Example[]) =>
    new Option('-e,--example <name>', 'Example project').choices(examples.map(({ id }) => id)).argParser((id) => {
        const example = examples.find((e) => e.id === id)
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

export const branchOption = new Option('--branch <branch>', 'Branch to pull examples from (defaults to main)')
