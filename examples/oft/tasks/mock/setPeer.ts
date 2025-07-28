import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArguments {
    remoteEid: number
    contractName: string
    address: string
}

/*
V2 Interface:
function setPeer(uint32 _eid, bytes32 _peer) public virtual onlyOwner {}

V1 Interface (deprecated):
function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external onlyOwner {
    trustedRemoteLookup[_remoteChainId] = abi.encodePacked(_remoteAddress, address(this));
    emit SetTrustedRemoteAddress(_remoteChainId, _remoteAddress);
}
*/

const action = async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { remoteEid, contractName } = taskArgs
    const remotePeer = addressToBytes32(taskArgs.address)

    // Get local contract
    const deployedOApp = await hre.deployments.get(contractName)
    const deployedOAppInstance = await hre.ethers.getContractAt(contractName, deployedOApp.address)

    console.log(`\n📋 Setting peer for OApp configuration:`)
    console.log(`   Local OApp:     ${deployedOApp.address} (${contractName})`)
    console.log(`   Remote EID:     ${remoteEid}`)
    console.log(`   Remote Peer:    ${remotePeer}`)
    console.log(`   Original Addr:  ${taskArgs.address}\n`)

    console.log(`Setting peer for EID ${remoteEid}...`)
    const tx = await deployedOAppInstance.setPeer(remoteEid, remotePeer)

    const receipt = await tx.wait()
    console.log(`✅ setPeer txHash: ${receipt.transactionHash}`)
    console.log(`🎉 Peer relationship established successfully!\n`)
}

task('lz:simple-dvn:set-peer', 'Set peer relationship for LayerZero V2 OApp', action)
    .addParam('remoteEid', 'Remote endpoint ID (uint32)', undefined, types.int)
    .addParam('contractName', 'Name of the local OApp contract in deployments', 'MyOFTMock', types.string)
    .addParam('address', 'Remote peer address (will be converted to bytes32)', undefined, types.string)
