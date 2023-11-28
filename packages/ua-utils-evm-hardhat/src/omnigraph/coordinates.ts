import 'hardhat-deploy/dist/src/type-extensions'
import '@layerzerolabs/utils-evm-hardhat/type-extensions'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/ua-utils'
import type { Deployment } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { assertHardhatDeploy } from '@/internal/assertions'

export const contractNameToPoint = async (
    hre: HardhatRuntimeEnvironment,
    contractName: string
): Promise<OmniPoint | undefined> => {
    assertHardhatDeploy(hre)

    const eid = hre.network.config.endpointId
    if (eid == null) return undefined

    const deployment = await hre.deployments.getOrNull(contractName)
    if (deployment == null) return undefined

    return eidAndDeploymentToPoint(eid, deployment)
}

export const eidAndDeploymentToPoint = (eid: EndpointId, { address }: Deployment): OmniPoint => ({
    eid,
    address,
})
