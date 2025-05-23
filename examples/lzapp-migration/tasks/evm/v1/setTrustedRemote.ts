import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArguments {
    remoteEid: number
    contractName: string
    address: string
}

/*
function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = abi.encodePacked(_remoteAddress, address(this));
        emit SetTrustedRemoteAddress(_remoteChainId, _remoteAddress);
    }
*/

// for Endpoint V1 OFT -> OFT202, minDstGas is not used but still needs to be set to a non-zero value, to bypass gas assertion
// we still allow this script to have a user specified minGas value so that it can be used for Endpoint V1 <> Endpoint V1 pathways
const action = async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { remoteEid, contractName } = taskArgs
    const remoteAddress = addressToBytes32(taskArgs.address)
    // get local contract
    const deployedLzApp = await hre.deployments.get(contractName)
    const deployedLzAppInstance = await hre.ethers.getContractAt(contractName, deployedLzApp.address)

    console.log(`\nSetting trusted remote address for ${remoteEid} to ${remoteAddress}..`)

    const tx = await deployedLzAppInstance.setTrustedRemoteAddress(remoteEid, remoteAddress)

    const receipt = await tx.wait()
    console.log(`setTrustedRemoteAddressTxnHash: ${receipt.transactionHash}`)
}

task('lz:lzapp:set-trusted-remote', 'set trusted remote (Endpoint V1)', action)
    .addParam('remoteEid', 'Destination eid', undefined, types.int)
    .addParam('contractName', 'Name of the contract in deployments folder', 'MyEndpointV1OFTV2Mock', types.string)
    .addParam('address', 'Remote address', undefined, types.string)
