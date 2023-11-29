import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/ua-utils'
import type { Deployment } from 'hardhat-deploy/dist/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import { assertHardhatDeploy } from '../internal/assertions'
import { getNetworkNamesByEid, getNetworkRuntimeEnvironment } from '../runtime'
import { OmniContract } from '@layerzerolabs/utils-evm'
import { Contract } from '@ethersproject/contracts'

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
