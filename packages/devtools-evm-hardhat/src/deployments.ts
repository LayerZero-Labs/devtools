import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createGetHreByEid } from './runtime'
import { Deployment } from 'hardhat-deploy/dist/types'

const alwaysTrue = () => true

/**
 * Creates a function for clearing existing deployments from filesystem.
 *
 * This is mostly useful for cleanups after tests but might come in handy
 * in other scenarios as well.
 *
 * ```
 * const clearDeployments = createClearDeployments()
 *
 * // Clear all deployments for Fuji
 * await clearDeployments(EndpointId.AVALANCHE_V2_TESTNET)
 *
 * // Clear MyOFT deployments for Fuji
 * await clearDeployments(EndpointId.AVALANCHE_V2_TESTNET, (contractName) => contractName === 'MyOFT')
 * ```
 *
 * @param getHreByEid
 * @returns
 */
export const createClearDeployments =
    (getHreByEid = createGetHreByEid()) =>
    async (eid: EndpointId, filter: (contractName: string, deployment: Deployment) => boolean = alwaysTrue) => {
        const hre = await getHreByEid(eid)
        const contractNames: string[] = Object.entries(await hre.deployments.all()).flatMap(
            ([contractName, deployment]) => (filter(contractName, deployment) ? [contractName] : [])
        )

        await Promise.all(contractNames.map((contractName) => hre.deployments.delete(contractName)))
    }
