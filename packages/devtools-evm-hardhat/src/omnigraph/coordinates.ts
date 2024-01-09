import type { OmniPoint } from '@layerzerolabs/devtools'
import pMemoize from 'p-memoize'
import { OmniContract } from '@layerzerolabs/devtools-evm'
import { Contract } from '@ethersproject/contracts'
import assert from 'assert'
import { OmniContractFactoryHardhat, OmniDeployment } from './types'
import { createGetHreByEid } from '@/runtime'
import { assertHardhatDeploy } from '@/internal/assertions'

export const omniDeploymentToPoint = ({ eid, deployment }: OmniDeployment): OmniPoint => ({
    eid,
    address: deployment.address,
})

export const omniDeploymentToContract = ({ eid, deployment }: OmniDeployment): OmniContract => ({
    eid,
    contract: new Contract(deployment.address, deployment.abi),
})

export const createContractFactory = (environmentFactory = createGetHreByEid()): OmniContractFactoryHardhat => {
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
            // The deployments can contain multiple deployment files for the same address
            //
            // This happens (besides of course a case of switching RPC URLs without changing network names)
            // when using proxies - hardhat-deploy will create multiple deployment files
            // with complete and partial ABIs
            //
            // To handle this case we'll merge the ABIs to make sure we have all the methods available
            const deployments = await env.deployments.getDeploymentsFromAddress(address)
            assert(deployments.length > 0, `Could not find a deployment for address '${address}'`)

            const mergedAbis = deployments.flatMap((deployment) => deployment.abi)
            return { eid, contract: new Contract(address, mergedAbis) }
        }

        assert(false, 'At least one of contractName, address must be specified for OmniPointHardhat')
    })
}
