import { types as builtInTypes } from 'hardhat/config'
import { HardhatError } from 'hardhat/internal/core/errors'
import { ERRORS } from 'hardhat/internal/core/errors-list'
import type { CLIArgumentType } from 'hardhat/types'
import { splitCommaSeparated } from '@layerzerolabs/devtools'
import { isEVMAddress, SignerDefinition } from '@layerzerolabs/devtools-evm'
import { isLogLevel, LogLevel } from '@layerzerolabs/io-devtools'
import { EndpointId, Environment, Stage } from '@layerzerolabs/lz-definitions'

/**
 * Hardhat CLI type for a comma separated list of arbitrary strings
 */
const csv: CLIArgumentType<string[]> = {
    name: 'csv',
    parse(name: string, value: string) {
        return splitCommaSeparated(value)
    },
    validate() {},
}

const isEnvironment = (value: string): value is Environment => Object.values<string>(Environment).includes(value)

/**
 * Hardhat CLI type for a LayzerZero chain environment
 *
 * @see {@link Environment}
 */
const environment: CLIArgumentType<Environment> = {
    name: 'environment',
    parse(name: string, value: string) {
        if (!isEnvironment(value)) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'environment',
            })
        }

        return value
    },
    validate() {},
}

const isStage = (value: string): value is Stage => Object.values<string>(Stage).includes(value)

/**
 * Hardhat CLI type for a LayzerZero chain stage
 *
 * @see {@link Stage}
 */
const stage: CLIArgumentType<Stage> = {
    name: 'stage',
    parse(name: string, value: string) {
        if (!isStage(value)) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'stage',
            })
        }

        return value
    },
    validate() {},
}

/**
 * Hardhat CLI type for a LayzerZero chain stage
 *
 * @see {@link Stage}
 */
const eid: CLIArgumentType<EndpointId> = {
    name: 'eid',
    parse(name: string, value: string) {
        const valueAsInt = parseInt(value)
        if (isNaN(valueAsInt)) {
            const eid = EndpointId[value]

            if (typeof eid !== 'number') {
                throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                    value,
                    name: name,
                    type: 'stage',
                })
            }

            return eid
        }

        const eidLabel = EndpointId[valueAsInt]
        if (typeof eidLabel !== 'string') {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'stage',
            })
        }

        return valueAsInt as EndpointId
    },
    validate() {},
}

/**
 * Hardhat CLI type for a log level argument
 *
 * @see {@link LogLevel}
 */
const logLevel: CLIArgumentType<LogLevel> = {
    name: 'logLevel',
    parse(name: string, value: string) {
        if (!isLogLevel(value)) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'logLevel',
            })
        }

        return value
    },
    validate() {},
}

/**
 * Hardhat CLI type for a function argument.
 *
 * This is only to be used with subtasks since you cannot pass functions
 * to tasks (unless you're insane and want to inline a function)
 */
export const fn: CLIArgumentType<string> = {
    name: 'function',
    parse: (argName, value) => {
        if (typeof value !== 'function') {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: argName,
                type: fn.name,
            })
        }

        return value
    },
    validate() {},
}

/**
 * Signer-specific CLI argument (either a non-negative index
 * or a signer EVM address)
 */
export const signer: CLIArgumentType<SignerDefinition> = {
    name: 'signer',
    parse: (argName, value) => {
        // If the value looks like an EVM address, we'll return an address definition
        if (isEVMAddress(value)) {
            return { type: 'address', address: value }
        }

        // If the value parses to an integer, we'll return an index definition
        const parsed = parseInt(value, 10)
        if (!isNaN(parsed)) {
            if (parsed < 0) {
                throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                    value,
                    name: argName,
                    type: signer.name,
                })
            }

            return { type: 'index', index: parsed }
        }

        // In any other case we'll return a named definition
        return { type: 'named', name: value }
    },
    validate() {},
}

export const types = { csv, eid, logLevel, fn, signer, environment, stage, ...builtInTypes }
