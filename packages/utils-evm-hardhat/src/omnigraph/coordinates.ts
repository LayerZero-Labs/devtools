import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/utils'
import type { Deployment } from 'hardhat-deploy/dist/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import pMemoize from 'p-memoize'
import { OmniContract } from '@layerzerolabs/utils-evm'
import { Contract } from '@ethersproject/contracts'
import assert from 'assert'
import { OmniContractFactory } from './types'
import { createNetworkEnvironmentFactory, getDefaultRuntimeEnvironment } from '@/runtime'
import { assertHardhatDeploy } from '@/internal/assertions'

export interface OmniDeployment {
    eid: EndpointId
    deployment: Deployment
}

export const omniDeploymentToPoint = ({ eid, deployment }): OmniPoint => ({ eid, address: deployment.address })

export const omniDeploymentToContract = ({ eid, deployment }): OmniContract => ({
    eid,
    contract: new Contract(deployment.address, deployment.abi),
})

export const createContractFactory = (
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment(),
    environmentFactory = createNetworkEnvironmentFactory(hre)
): OmniContractFactory => {
    return pMemoize(async ({ eid, address, contractName }) => {
        const env = await environmentFactory(eid)
        assertHardhatDeploy(env)

        // If we have both the contract name & address, we go off artifacts
        if (contractName != null && address != null) {
            const artifact = await env.deployments.getArtifact(contractName)
            const contract = new Contract(address, artifact.abi)

            return { eid, contract }
        }

        // If we have the contract name but no address, we need to get it from the deployments by name
        if (contractName != null && address == null) {
            const deployment = await env.deployments.getOrNull(contractName)
            assert(deployment != null, `Could not find a deployment for contract '${contractName}'`)

            return omniDeploymentToContract({ eid, deployment })
        }

        // And if we only have the address, we need to go get it from deployments by address
        if (address != null) {
            const [deployment] = await env.deployments.getDeploymentsFromAddress(address)
            assert(deployment != null, `Could not find a deployment for address '${address}'`)

            return omniDeploymentToContract({ eid, deployment })
        }

        assert(false, 'At least one of contractName, address must be specified for OmniPointHardhat')
    })
}
