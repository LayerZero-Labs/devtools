import { getNetworkForChainId, EndpointId } from '@layerzerolabs/lz-definitions'
import { getContractNameFromLzConfig, getMoveVMOAppAddress } from '../tasks/move/utils/utils'
import { OFTFactory } from './OFTFactory'
import { getMoveVMPrivateKey, promptUserContractSelection } from '../tasks/move/utils/config'
import { getMoveVMAccountAddress, getMoveVMContracts } from '../tasks/move/utils/config'
import { getLzConfig, checkConfigYamlNetwork } from '../tasks/move/utils/config'
import { getConnection } from './moveVMConnectionBuilder'
import { RESTClient } from '@initia/initia.js'
import { Aptos } from '@aptos-labs/ts-sdk'
import { IOFT } from './IOFT'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import * as path from 'path'

export interface TaskContext {
    accountAddress: string
    privateKey: string
    chain: string
    stage: string
    oAppAddress: string
    oft: IOFT
    moveVMConnection: Aptos | RESTClient
    srcEid: EndpointId
    lzConfig: OAppOmniGraphHardhat
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
    fullConfigPath: string
}

export interface DeployTaskContext {
    accountAddress: string
    privateKey: string
    chain: string
    stage: string
    moveVMConnection: Aptos | RESTClient
    srcEid: EndpointId
    lzConfig: OAppOmniGraphHardhat
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
    fullConfigPath: string
}

export async function initializeTaskContext(configPath: string): Promise<TaskContext> {
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const network = getNetworkForChainId(selectedContract.contract.eid)
    const chainName = network.chainName
    const stage = network.env
    const accountAddress = getMoveVMAccountAddress(chainName)
    const moveVMConnection = getConnection(chainName, stage)
    const moveVMPrivateKey = getMoveVMPrivateKey(chainName)
    const srcEid = selectedContract.contract.eid
    const contractName = getContractNameFromLzConfig(srcEid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chainName, stage)
    const oft = OFTFactory.create(moveVMConnection, oAppAddress, accountAddress, moveVMPrivateKey, srcEid)
    const fullConfigPath = path.join(process.cwd(), configPath)

    return {
        accountAddress: accountAddress,
        privateKey: moveVMPrivateKey,
        chain: chainName,
        stage,
        oAppAddress,
        oft,
        moveVMConnection,
        srcEid: srcEid,
        lzConfig: lzConfig,
        selectedContract: selectedContract,
        fullConfigPath: fullConfigPath,
    }
}

export async function initializeDeployTaskContext(configPath: string): Promise<DeployTaskContext> {
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const network = getNetworkForChainId(selectedContract.contract.eid)
    const chainName = network.chainName
    const stage = network.env
    await checkConfigYamlNetwork(chainName)
    const accountAddress = getMoveVMAccountAddress(chainName)
    const moveVMConnection = getConnection(chainName, stage)
    const moveVMPrivateKey = getMoveVMPrivateKey(chainName)
    const srcEid = selectedContract.contract.eid
    const fullConfigPath = path.join(process.cwd(), configPath)

    return {
        accountAddress: accountAddress,
        privateKey: moveVMPrivateKey,
        chain: chainName,
        stage,
        moveVMConnection,
        srcEid: srcEid,
        lzConfig: lzConfig,
        selectedContract: selectedContract,
        fullConfigPath: fullConfigPath,
    }
}
