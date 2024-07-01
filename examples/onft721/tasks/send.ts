import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '../../../packages/devtools/dist'

const DEFAULT_EXTRA_OPTIONS = '0x'
const DEFAULT_COMPOSE_MSG = '0x'
const DEFAULT_OFT_CMD = '0x'

const ONFT721_ABI = [
    'function send((uint32 dstEid,bytes32 to,uint256 tokenId,bytes extraOptions,bytes composeMsg,bytes oftCmd),(uint256 nativeFee,uint256 lzFee),address refundAddress) external payable returns (MessagingReceipt msgReceipt)',
    'function quoteSend((uint32 dstEid,bytes32 to,uint256 tokenId,bytes extraOptions,bytes composeMsg,bytes oftCmd),bool payInLzToken) external view returns ((uint256, uint256))',
]

const getONFT721Contract = async (hre: HardhatRuntimeEnvironment, onft721Address: string, signer: SignerWithAddress) =>
    hre.ethers.getContractAt(ONFT721_ABI, onft721Address, signer)

const createSendParam = (user: SignerWithAddress, taskArgs: TaskArgs) => {
    return {
        dstEid: taskArgs.dstEid,
        to: makeBytes32(user.address),
        tokenId: taskArgs.tokenId,
        extraOptions: DEFAULT_EXTRA_OPTIONS,
        composeMsg: DEFAULT_COMPOSE_MSG,
        oftCmd: DEFAULT_OFT_CMD,
    }
}

interface TaskArgs {
    onft721Address: string
    dstEid: number
    to: string
    tokenId: number
}

const action: ActionType<TaskArgs> = async (taskArgs: TaskArgs, hre) => {
    const signer = (await hre.getNamedAccounts()).deployer
    const user = await hre.ethers.getSigner(signer)

    const sendParam = createSendParam(user, taskArgs)
    const onft721 = await getONFT721Contract(hre, taskArgs.onft721Address, user)
    const messagingFee = await onft721.quoteSend(sendParam, false)

    const tx = await onft721.send(sendParam, messagingFee, user.address, {
        value: messagingFee[0],
        gasLimit: 1_000_000,
    })
    const txReceipt = await tx.wait()
    console.log(`Transaction hash: ${txReceipt.transactionHash}`)
}

task('send', 'Send ONFT721 from one chain to another', action)
    .addParam('onft721Address', 'ONFT721 contract address')
    .addParam('dstEid', 'Destination LayerZero EndpointV2 ID')
    .addParam('tokenId', 'Token ID')
