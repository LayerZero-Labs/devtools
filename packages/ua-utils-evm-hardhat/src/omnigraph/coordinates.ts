import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/ua-utils'
import type { Deployment } from 'hardhat-deploy/dist/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import pMemoize from 'p-memoize'
import { OmniContract } from '@layerzerolabs/utils-evm'
import { Contract } from '@ethersproject/contracts'
import assert from 'assert'
import { OmniDeploymentFactory, OmniPointContractName, OmniPointHardhat } from './types'
import { assertHardhatDeploy, createNetworkEnvironmentFactory } from '@layerzerolabs/utils-evm-hardhat'

export interface OmniDeployment {
    eid: EndpointId
    deployment: Deployment
}

export const omniDeploymentToPoint = ({ eid, deployment }): OmniPoint => ({ eid, address: deployment.address })

export const omniDeploymentToContract = ({ eid, deployment }): OmniContract => ({
    eid,
    contract: new Contract(deployment.address, deployment.abi),
})

export const isOmniPointContractName = (point: OmniPointHardhat): point is OmniPointContractName =>
    'contractName' in point && typeof point.contractName === 'string'

export const createDeploymentFactory = (hre: HardhatRuntimeEnvironment): OmniDeploymentFactory => {
    assertHardhatDeploy(hre)

    const environmentFactory = createNetworkEnvironmentFactory(hre)

    return pMemoize(async (point) => {
        const env = await environmentFactory(point.eid)
        assertHardhatDeploy(env)

        let deployment: Deployment | null

        if (isOmniPointContractName(point)) {
            deployment = await env.deployments.getOrNull(point.contractName)

            assert(
                deployment,
                `Could not find a deployment for contract '${point.contractName}' on endpoint ${point.eid}`
            )
        } else {
            ;[deployment] = await env.deployments.getDeploymentsFromAddress(point.address)

            assert(
                deployment,
                `Could not find a deployment for on address '${point.address}' and endpoint ${point.eid}`
            )
        }

        return { eid: point.eid, deployment }
    })
}
