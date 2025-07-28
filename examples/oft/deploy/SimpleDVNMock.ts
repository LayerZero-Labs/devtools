import { type DeployFunction } from 'hardhat-deploy/types'

import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'

const contractName = 'SimpleDVN'
/*
constructor(
    address _receiveUln,   // ReceiveUln302 address (e.g. EndpointV2.ReceiveUln)
    uint32  _localEid,     // eid of *this* chain
    bytes32 _oftRemoteAddr // remote OFT addr as bytes32 (AddressCast.toBytes32)
) {
    receiveUln      = IReceiveUlnE2(_receiveUln);
    localEid        = _localEid;
    oftRemoteAddr   = _oftRemoteAddr;
}
*/
const deploy: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    console.log('Deploy script started...')
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const receiveUlnAddress = (await deployments.get('ReceiveUln302')).address // retrieved EndpointV1 address based on eid set in hardhat config

    if (!receiveUlnAddress) {
        throw new Error(`No endpoint address found for network: ${network.name}`)
    }

    const localEid = getEidForNetworkName(network.name)

    await deploy(contractName, {
        from: deployer,
        args: [receiveUlnAddress, localEid],
        log: true,
        waitConfirmations: 1,
    })
}

deploy.tags = [contractName]
export default deploy
