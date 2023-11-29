import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/ua-utils'
import type { Deployment } from 'hardhat-deploy/dist/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import pMemoize from 'p-memoize'
import { assertHardhatDeploy } from '../internal/assertions'
import { createNetworkEnvironmentFactory, getNetworkNamesByEid, getNetworkRuntimeEnvironment } from '../runtime'
import { EndpointBasedFactory, OmniContract } from '@layerzerolabs/utils-evm'
import { Contract } from '@ethersproject/contracts'
import assert from 'assert'

export interface OmniDeployment {
    eid: EndpointId
    deployment: Deployment
}

export const omniDeploymentToPoint = ({ eid, deployment }): OmniPoint => ({ eid, address: deployment.address })

export const omniDeploymentToContract = ({ eid, deployment }): OmniContract => ({
    eid,
    contract: new Contract(deployment.address, deployment.abi),
})

/**
 * Collects all deployment of a certain contract along with their endpoint IDs.
 *
 * Network s which don't have `endpointId` configured in their hardhat network config will be ignored
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @param contractName `string`
 * @returns `OmniDeployment[]`
 */
export const collectDeployments = async (
    hre: HardhatRuntimeEnvironment,
    contractName: string
): Promise<OmniDeployment[]> => {
    assertHardhatDeploy(hre)

    const deployments: OmniDeployment[] = []
    const networkNamesByEid = getNetworkNamesByEid(hre)

    for (const [eid, networkName] of networkNamesByEid) {
        const env = await getNetworkRuntimeEnvironment(networkName)
        const deployment = await env.deployments.getOrNull(contractName)
        if (deployment == null) continue

        deployments.push({ eid, deployment })
    }

    return deployments
}

export const createDeploymentFactoryForContract = (
    hre: HardhatRuntimeEnvironment,
    contractName: string
): EndpointBasedFactory<OmniDeployment> => {
    assertHardhatDeploy(hre)

    const environmentFactory = createNetworkEnvironmentFactory(hre)

    return pMemoize(async (eid: EndpointId) => {
        const env = await environmentFactory(eid)

        const deployment = await env.deployments.getOrNull(contractName)
        assert(deployment, `Could not find a deployment for contract '${contractName}' on endpoint ${eid}`)

        return { eid, deployment }
    })
}
