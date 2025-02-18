import { VerifyHardhatFilterConfig, VerifyHardhatFilterFunction, VerifyHardhatPathsConfig } from './types'
import path from 'path'

export const parsePathsConfig = (
    partialPathsConfig: Partial<VerifyHardhatPathsConfig> | null | undefined
): VerifyHardhatPathsConfig => ({
    deployments: partialPathsConfig?.deployments ?? path.resolve(process.cwd(), 'deployments'),
})

/**
 * Takes VerifyHardhatFilterConfig and turns it into a verify function
 *
 * What does that mean?
 *
 * Well
 *
 * VerifyHardhatFilterConfig supports multiple ways of specifying which contracts
 * to verify:
 *
 * - `string` matched against the contract name (case-sensitive)
 * - `RegExp` matched against the contract name
 * - `boolean` that enables/disabled verification for all contracts
 * - `string[]` in which case the contract name is matched against against the elements of the array (case-sensitive)
 * - `function` that gets passed the contract name and the contract path and returns a boolean to indicate whether that contract should be verified
 *
 * Before the verification script is ran, all of these configuration options
 * are turned into a `function` (the last option) so that we can use this config in a uniform way
 * without having to deal with all these cases in the script code
 *
 * @param filterConfig
 * @returns VerifyHardhatFilterFunction
 */
export const parseFilterConfig = (
    filterConfig: VerifyHardhatFilterConfig | null | undefined
): VerifyHardhatFilterFunction => {
    if (filterConfig == null) {
        return () => true
    }

    switch (typeof filterConfig) {
        case 'boolean':
            return () => filterConfig

        case 'string':
            return (name) => name === filterConfig

        case 'function':
            return filterConfig

        case 'object':
            if (Array.isArray(filterConfig)) {
                const contractsToVerify = new Set(filterConfig)

                return (name) => contractsToVerify.has(name)
            }

            if (filterConfig instanceof RegExp) {
                return (name) => filterConfig.test(name)
            }

            throw new TypeError(
                `Invalid verify configuration: expected string, string[], boolean, function or a RegExp, got ${filterConfig}`
            )

        default:
            throw new TypeError(
                `Invalid verify configuration: expected string, string[], boolean, function or a RegExp, got ${filterConfig}`
            )
    }
}
