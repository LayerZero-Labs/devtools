import fs from 'fs'
import path from 'path'

import { importDefault, Logger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

import type { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import type { CoreSpotDeployment, TxData } from '@/types'

function getFullPath(index: string, isTestnet: boolean): string {
    return path.join(process.cwd(), 'deployments', `hypercore-${isTestnet ? 'testnet' : 'mainnet'}`, `${index}.json`)
}

export function getCoreSpotDeployment(index: string | number, isTestnet: boolean, logger?: Logger): CoreSpotDeployment {
    const fullPath = getFullPath(index.toString(), isTestnet)
    const nativeSpot = fs.readFileSync(fullPath, 'utf8')
    if (!nativeSpot) {
        const errMsg = `Native spot ${index} not found - make sure the native spot for the token ${index} is found at ${fullPath}`
        logger?.error(errMsg)
        throw new Error(errMsg)
    }
    return JSON.parse(nativeSpot) as CoreSpotDeployment
}

export function writeCoreSpotDeployment(
    index: string | number,
    isTestnet: boolean,
    coreSpotDeployment: CoreSpotDeployment,
    logger?: Logger
) {
    const fullPath = getFullPath(index.toString(), isTestnet)

    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(fullPath, JSON.stringify(coreSpotDeployment, null, 2))
    logger?.info(`Wrote deployment ${fullPath}`)
}

export function writeUpdatedCoreSpotDeployment(
    index: string | number,
    isTestnet: boolean,
    tokenFullName: string,
    tokenAddress: string,
    txData: TxData,
    logger?: Logger
) {
    const fullPath = getFullPath(index.toString(), isTestnet)

    const spot = getCoreSpotDeployment(index, isTestnet, logger)
    spot.coreSpot.evmContract = {
        address: tokenAddress,
        evm_extra_wei_decimals: txData.weiDiff ?? 0,
    }
    spot.coreSpot.fullName = tokenFullName
    spot.txData.txHash = txData.txHash
    spot.txData.nonce = txData.nonce
    spot.txData.from = txData.from
    spot.txData.connected = txData.connected
    spot.txData.weiDiff = txData.weiDiff

    fs.writeFileSync(fullPath, JSON.stringify(spot, null, 2))
    logger?.info(`Updated core spot ${index}`)
}

export function writeNativeSpotConnected(
    index: string | number,
    isTestnet: boolean,
    connected: boolean,
    weiDiff: number,
    logger?: Logger
) {
    const fullPath = getFullPath(index.toString(), isTestnet)

    const spot = getCoreSpotDeployment(index, isTestnet, logger)
    spot.txData.connected = connected
    spot.txData.weiDiff = weiDiff

    fs.writeFileSync(fullPath, JSON.stringify(spot, null, 2))
    logger?.info(`Updated core spot ${index}`)
}

export async function getHyperEVMOAppDeployment(
    oapp_config: string,
    network: string,
    logger?: Logger
): Promise<{ contractName: string; deployment: string }> {
    if (oapp_config == undefined) {
        logger?.info(`oapp-config not supplied. prompting user for inputs`)
        throw new Error(`oapp-config not found for ${network}`)
    }

    const targetEid =
        network === 'testnet'
            ? EndpointId.HYPERLIQUID_V2_TESTNET.valueOf()
            : EndpointId.HYPERLIQUID_V2_MAINNET.valueOf()

    const lzConfigPath = path.join(process.cwd(), oapp_config)
    logger?.info(`LZ config path: ${lzConfigPath}`)

    const lzConfig = await importDefault(lzConfigPath)
    const contracts = (lzConfig as OAppOmniGraphHardhat).contracts
    const contractName = contracts.find((contract) => contract.contract.eid === targetEid)?.contract.contractName
    if (!contractName) {
        throw new Error(`HyperEVM deployment not found for ${targetEid}`)
    }

    const hardhatConfigPath = path.join(process.cwd(), 'hardhat.config.ts')
    logger?.info(`Hardhat config path: ${hardhatConfigPath}`)

    const hardhatConfig = await importDefault(hardhatConfigPath)
    const networks = (hardhatConfig as HardhatUserConfig).networks
    const networkKey = Object.keys(networks as NetworkUserConfig).find((key) => networks?.[key]?.eid === targetEid)
    if (!networkKey) {
        throw new Error(`Network not found for ${targetEid}`)
    }

    const deploymentFilePath = path.join(process.cwd(), 'deployments', networkKey, `${contractName}.json`)
    logger?.info(`HyperEVM-${network} deployment file: ${deploymentFilePath}`)

    const deploymentFile = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'))

    return {
        contractName: contractName,
        deployment: deploymentFile,
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getERC20abi(): Promise<any> {
    const erc20Path = path.join(__dirname, '..', 'src', 'types', 'ERC20.json')
    const erc20Abi = JSON.parse(fs.readFileSync(erc20Path, 'utf8'))
    return erc20Abi['abi']
}
