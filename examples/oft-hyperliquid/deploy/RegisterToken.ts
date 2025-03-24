import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import {
    finalizeEvmContract,
    getNativeSpot,
    requestEvmContract,
    useSmallBlock,
    writeNativeSpotConnected,
} from '@layerzerolabs/oft-hyperliquid-evm'

const deployTag = 'register-token'

const evmDecimals = 18
const nativeSpotName = 'CHARLI'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre

    // Validates and returns the native spot
    const hip1Token = getNativeSpot(nativeSpotName)

    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    assert(privateKey, 'PRIVATE_KEY_HYPERLIQUID is not set in .env file')

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'error'

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const evmExtraWeiDecimals = evmDecimals - hip1Token.nativeSpot.weiDecimals
    console.log(`EVM extra wei decimals: ${evmExtraWeiDecimals}`)
    console.log(`Native spot index: ${hip1Token.nativeSpot.index}`)

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel)
        console.log(JSON.stringify(res, null, 2))
    }

    assert(hip1Token.nativeSpot.evmContract, 'Native spot EVM contract is not set')

    // Request EVM contract - sends a request to HyperCore to connect the HyperCore HIP1 token to HyperEVM ERC20 token
    {
        const res = await requestEvmContract(
            wallet,
            isTestnet,
            hip1Token.nativeSpot.evmContract,
            evmExtraWeiDecimals,
            hip1Token.nativeSpot.index,
            loglevel
        )
        console.log(JSON.stringify(res, null, 2))
    }

    // Finalize EVM contract - sends a request to HyperCore to finalize the HyperCore HIP1 token to HyperEVM ERC20 token
    {
        const res = await finalizeEvmContract(
            wallet,
            isTestnet,
            hip1Token.nativeSpot.index,
            hip1Token.txData.nonce,
            loglevel
        )
        console.log(JSON.stringify(res, null, 2))
    }

    writeNativeSpotConnected(nativeSpotName, true, evmExtraWeiDecimals)
    console.log('GIVE THIS ADDRESS SOME NATIVE TOKENS TO ACTIVATE ON HYPERCORE')
}

deploy.tags = [deployTag]

export default deploy
