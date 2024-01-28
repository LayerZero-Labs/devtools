import { types as builtInTypes } from 'hardhat/config'
import { HardhatError } from 'hardhat/internal/core/errors'
import { ERRORS } from 'hardhat/internal/core/errors-list'
import { CLIArgumentType } from 'hardhat/types'
import { z } from 'zod'
import { getEidsByNetworkName } from './runtime'

/**
 * Helper zod schema that splits a comma-separated string
 * into individual values, trimming the results
 */
const CommaSeparatedValuesSchema = z.string().transform((value) =>
    value
        .trim()
        .split(/\s*,\s*/)
        .filter(Boolean)
)

/**
 * Hardhat CLI type for a comma separated list of arbitrary strings
 */
const csv: CLIArgumentType<string[]> = {
    name: 'csv',
    parse(name: string, value: string) {
        const result = CommaSeparatedValuesSchema.safeParse(value)
        if (!result.success) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'csv',
            })
        }

        return result.data
    },
    validate() {},
}

/**
 * Hardhat CLI type for a comma separated list of network names
 */
const networks: CLIArgumentType<string[]> = {
    name: 'networks',
    parse(name: string, value: string) {
        const networkNames = csv.parse(name, value)
        const allDefinedNetworks = getEidsByNetworkName()
        const networks = networkNames.map((networkName) => {
            if (networkName in allDefinedNetworks) return networkName

            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value: networkName,
                name: name,
                type: 'network',
            })
        })

        return networks
    },
    validate() {},
}

export const types = { csv, networks, ...builtInTypes }
