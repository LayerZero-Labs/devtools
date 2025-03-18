import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { useSmallBlock } from '@layerzerolabs/oft-hyperliquid-evm'

const contractName_oft = 'MyHyperLiquidOFT'
const deploy: DeployFunction = async (hre) => {
    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    assert(privateKey, 'PRIVATE_KEY_HYPERLIQUID is not set in .env file')

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'info'

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'

    const networkName = hre.network.name
    console.log(`Network: ${networkName}`)

    assert(
        networkName === 'hyperliquid-testnet' || networkName === 'hyperliquid-mainnet',
        'This deploy script interacts with hyperliquid networks'
    )

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    const res = await useSmallBlock(wallet, isTestnet, loglevel)
    console.log(JSON.stringify(res, null, 2))
}

// MyHyperLiquidOFT-hyperliquid
deploy.tags = [`${contractName_oft}-hyperliquid`]

export default deploy
