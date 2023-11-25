import assert from 'assert'
import 'hardhat-deploy/dist/src/type-extensions'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export const assertHardhatDeploy = (hre: HardhatRuntimeEnvironment) =>
    assert(hre.deployments, `You don't seem to be using hardhat-deploy in your project`)
