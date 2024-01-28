import { types as builtInTypes } from 'hardhat/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'
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
 * Hardhat CLI type for a comma separated list of network names
 */
const networks: CLIArgumentType<[networkName: string, eid: EndpointId | undefined][]> = {
    name: 'networks',
    parse(name: string, value: string) {
        const result = CommaSeparatedValuesSchema.safeParse(value)
        if (!result.success) {
            throw new HardhatError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
                value,
                name: name,
                type: 'networks',
            })
        }

        const networkNames = result.data
        const allDefinedNetworks = getEidsByNetworkName()
        const networks: [string, EndpointId | undefined][] = networkNames.map((networkName) => {
            if (networkName in allDefinedNetworks) return [networkName, allDefinedNetworks[networkName]]

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

export const types = { networks, ...builtInTypes }
