import { getDefaultRuntimeEnvironment, getEidsByNetworkName } from '@/runtime'
import assert, { AssertionError } from 'assert'
import 'hardhat-deploy/dist/src/type-extensions'
import { DeploymentsExtension } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export interface HardhatRuntimeEnvironmentWithDeployments extends HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension
}

/**
 * Helper utility to make sure hardhat-deploy is being used by the project
 *
 * @param {HardhatRuntimeEnvironment} hre
 */
export function assertHardhatDeploy(
    hre: HardhatRuntimeEnvironment
): asserts hre is HardhatRuntimeEnvironmentWithDeployments {
    assert(hre.deployments, `You don't seem to be using hardhat-deploy in your project`)
}

/**
 * Helper utility to make sure that all the networks passed
 * to this function have been defined in the config
 *
 * @param {Iterable<string>} networkNames
 * @param {HardhatRuntimeEnvironment} hre
 */
export function assertDefinedNetworks<TNetworkNames extends Iterable<string>>(
    networkNames: TNetworkNames,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment()
): TNetworkNames {
    const definedNetworkNames = new Set(Object.keys(getEidsByNetworkName(hre)))

    for (const networkName of networkNames) {
        if (definedNetworkNames.has(networkName)) {
            continue
        }

        throw new AssertionError({
            message: `Network '${networkName}' has not been defined. Defined networks are ${Array.from(definedNetworkNames).join(', ')}`,
        })
    }

    return networkNames
}
