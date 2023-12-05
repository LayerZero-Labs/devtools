import assert from 'assert'
import 'hardhat-deploy/dist/src/type-extensions'
import { DeploymentsExtension } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export interface HardhatRuntimeEnvironmentWithDeployments extends HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension
}

export function assertHardhatDeploy(
    hre: HardhatRuntimeEnvironment
): asserts hre is HardhatRuntimeEnvironmentWithDeployments {
    assert(hre.deployments, `You don't seem to be using hardhat-deploy in your project`)
}
