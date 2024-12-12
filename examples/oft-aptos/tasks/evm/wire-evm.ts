import fs from 'fs'

import { Contract, ethers } from 'ethers'

import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { createSetSendConfigTransactions } from './wire/setSendConfig'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from '../move/utils/aptosNetworkParser'
import { getMoveVMOftAddress } from '../move/utils/utils'
import { createEidToNetworkMapping, getConfigConnections, getHHAccountConfig } from '../shared/utils'

import AnvilForkNode from './utils/anvilForkNode'
import { ContractMetadataMapping, NonEvmOAppMetadata, TxEidMapping, eid } from './utils/types'
import { createSetDelegateTransactions } from './wire/setDelegate'
import { createSetEnforcedOptionsTransactions } from './wire/setEnforcedOptions'
import { createSetPeerTransactions } from './wire/setPeer'
import { createSetReceiveLibraryTransactions } from './wire/setReceiveLibrary'
import { createSetSendLibraryTransactions } from './wire/setSendLibrary'
import { executeTransactions } from './wire/transactionExecutor'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

/**
 * @description Handles wiring of EVM contracts with the Aptos OApp
 * @dev Creates ethers's populated transactions for the various transaction types (setPeer, setDelegate, setEnforcedOptions, setSendLibrary, setReceiveLibrary, setReceiveLibraryTimeout). It then simulates them on a forked network before executing
 */
async function main() {
    const { network } = await parseYaml()
    const EID_APTOS = getEidFromAptosNetwork(network)

    // @todo grow connectionsToWire by taking in non-evm connections instead of only APTOS.
    const connectionsToWire = getConfigConnections('to', EID_APTOS)

    const accountConfigs = getHHAccountConfig()
    const networks = createEidToNetworkMapping()
    const rpcUrls = createEidToNetworkMapping('url')

    // Build a Transaction mapping for each type of transaction. It is further indexed by the eid.
    const TxTypeEidMapping: TxEidMapping = {
        setPeer: {},
        setDelegate: {},
        setEnforcedOptions: {},
        setSendLibrary: {},
        setReceiveLibrary: {},
        setReceiveLibraryTimeout: {},
        sendConfig: {},
        receiveConfig: {},
    }

    // Indexed by the eid it contains information about the contract, provider, and configuration of the account and oapp.
    const contractMetaData: ContractMetadataMapping = {}

    // @todo Use this as a primary key for NonEvmOAppWiring in the following code
    const lzNetworkStage = getLzNetworkStage(network)
    const APTOS_OAPP_ADDRESS = getMoveVMOftAddress(lzNetworkStage)

    const nonEvmOapp: NonEvmOAppMetadata = {
        address: APTOS_OAPP_ADDRESS,
        eid: EID_APTOS,
        rpc: rpcUrls[EID_APTOS],
    }

    /*
     * Looping through the connections we build out the contractMetaData and TxTypeEidMapping by reading from the deployment files.
     * contractMetaData contains ethers Contract objects for the OApp and EndpointV2 contracts.
     */
    for (const conn of connectionsToWire) {
        const fromEid = conn.from.eid as eid
        const fromNetwork = networks[fromEid]

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider)

        const OAppDeploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const OAppDeploymentData = JSON.parse(fs.readFileSync(OAppDeploymentPath, 'utf8'))
        const EndpointV2DeploymentData = getDeploymentAddressAndAbi(fromNetwork, 'EndpointV2')

        const { address: oappAddress, abi: oappAbi } = OAppDeploymentData
        const { address: epv2Address, abi: epv2Abi } = EndpointV2DeploymentData

        const OAppContract = new Contract(oappAddress, oappAbi, signer)
        const EPV2Contract = new Contract(epv2Address, epv2Abi, signer)

        contractMetaData[fromEid] = {
            address: {
                oapp: oappAddress,
                epv2: epv2Address,
            },
            contract: {
                oapp: OAppContract,
                epv2: EPV2Contract,
            },
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: conn.config ?? {},
        }
    }

    /*
     */
    TxTypeEidMapping.setPeer = await createSetPeerTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setDelegate = await createSetDelegateTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setEnforcedOptions = await createSetEnforcedOptionsTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setSendLibrary = await createSetSendLibraryTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setReceiveLibrary = await createSetReceiveLibraryTransactions(contractMetaData, nonEvmOapp)
    // TxTypeEidMapping.sendConfig = await createSetSendConfigTransactions(contractMetaData, nonEvmOapp)

    // TxTypeEidMapping.setReceiveLibraryTimeout = await createSetReceiveLibraryTimeoutTransactions(
    //     contractMetaData,
    //     nonEvmOapp
    // )

    // @todo Clean this up or move to utils
    const rpcUrlSelfMap: { [eid: eid]: string } = {}
    for (const [eid, eidData] of Object.entries(contractMetaData) as Array<
        [string, (typeof contractMetaData)[keyof typeof contractMetaData]]
    >) {
        rpcUrlSelfMap[Number(eid)] = eidData.provider.connection.url
    }

    const anvilForkNode = new AnvilForkNode(rpcUrlSelfMap, 8546)

    try {
        const forkRpcMap = await anvilForkNode.startNodes()
        await executeTransactions(contractMetaData, TxTypeEidMapping, forkRpcMap)
        console.log('\nAll transactions have been SIMULATED on the blockchains.')
        // await executeTransactions(contractMetaData, TxTypeEidMapping, rpcUrlSelfMap)
        // console.log('\nAll transactions have been EXECUTED on the blockchains.')
    } catch (error) {
        anvilForkNode.killNodes()
        throw error
    }
    anvilForkNode.killNodes()
}

// @todo Refactor this file.
main()
    .then(() => {
        console.log('Your EVM OApps have now been wired with the Aptos OApp.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
