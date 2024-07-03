import { task } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

const ABI = ['function mint(address _to, uint256 _tokenId) public']

const createMyONFT721MockContract = async (hre: HardhatRuntimeEnvironment, onft721Address: string) => {
    return await hre.ethers.getContractAt(ABI, onft721Address)
}

interface TaskArgs {
    onft721Address: string
    tokenId: number
}

const action: ActionType<TaskArgs> = async (taskArgs: TaskArgs, hre) => {
    const signer = (await hre.getNamedAccounts()).deployer
    const user = await hre.ethers.getSigner(signer)

    const myONFT721Mock = await createMyONFT721MockContract(hre, taskArgs.onft721Address)

    const tx = await myONFT721Mock.mint(user.address, taskArgs.tokenId)
    const txReceipt = await tx.wait()
    console.log(`Transaction hash: ${txReceipt.transactionHash}`)
}

task('mint', 'Mint ONFT721 Mock', action)
    .addParam('onft721Address', 'ONFT721 contract address')
    .addParam('tokenId', 'Token ID')
