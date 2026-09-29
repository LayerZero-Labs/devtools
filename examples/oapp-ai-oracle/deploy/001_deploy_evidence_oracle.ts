import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// LayerZero V2 testnet endpoint (shared across testnets)
const LZ_ENDPOINT_TESTNET = '0x6edce65403992e310a62460808c4b910d972f10f'

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deploy } = hre.deployments
    const { deployer } = await hre.getNamedAccounts()

    const endpointAddress = LZ_ENDPOINT_TESTNET

    await deploy('EvidenceOracle', {
        from: deployer,
        args: [endpointAddress, deployer],
        log: true,
        waitConfirmations: 1,
    })
}

deploy.tags = ['EvidenceOracle']
export default deploy
