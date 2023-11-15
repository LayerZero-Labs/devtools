import { Transaction, NetworkTransactions, getContractInstance, getLayerZeroChainId, executeTransactions } from "./utils/crossChainHelper"
import { configExist, getConfig, logError, printTransactions } from "./utils/helpers"
import { configExist, getConfig, logError, printTransactions } from "./utils/helpers"
import { setUseCustomAdapterParams, setMinDstGas, setTrustedRemote, getContractNameOrAddress } from "./utils/wireAllHelpers"

export default async function (taskArgs: any, hre: any) {
    if (!configExist(taskArgs.configPath)) {
        logError(`Wire up config file is not found.`)
        return
    }

    if (taskArgs.n && !configExist(taskArgs.gnosisConfigPath)) {
        logError(`Gnosis config file not found`)
        return
    }

    const deployer = (await hre.getNamedAccounts()).deployer
    console.log(`CURRENT SIGNER: ${deployer}`)

    const WIRE_UP_CONFIG = getConfig(taskArgs.configPath)
    const localNetworks = Object.keys(WIRE_UP_CONFIG?.chainConfig)

    const localNetwork = hre.network.name
    const getEnvironment = createGetNetworkEnvironment(hre)

    console.log(`************************************************`)
    console.log(`Computing diff`)
    console.log(`************************************************`)

    const transactionByNetwork: NetworkTransactions[] = (await Promise.all(
        localNetworks.map(async (localNetwork) => {
            // array of transactions to execute
            const transactions: Transaction[] = []
            const remoteNetworks = Object.keys(WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig)

            const localEnvironment = await getEnvironment(localNetwork)
            const localContract = getOAppContract(localNetwork, localEnvironment, WIRE_UP_CONFIG)
            if (localContractNameOrAddress === undefined) {
                logError(`Invalid wire up config for localContractNameOrAddress.`)
                return
            }

            await Promise.all(
                remoteNetworks.map(async (remoteNetwork) => {
                    // skip wiring itself
                    if (localNetwork === remoteNetwork) return

                    const remoteEnvironment = await getEnvironment(remoteNetwork)
                    const remoteContract = getOAppContract(remoteNetwork, remoteEnvironment, WIRE_UP_CONFIG)
                    if (remoteContractNameOrAddress === undefined) {
                        logError(`Invalid wire up config for remoteContractNameOrAddress.`)
                        return
                    }

                    // setPeer
                    transactions.push(...(await setPeer(localContract, remoteContract)))

                    // setEnforcedOptions
                    const enforcedOptions = WIRE_UP_CONFIG?.chainConfig?.[localNetwork]?.remoteNetworkConfig?.[remoteNetwork].enforcedOptions
                    if (enforcedOptions !== undefined) {
                        transactions.push(...(await setEnforcedOptions(localContract, remoteContract, enforcedOptions)))
                    }
                })
            )
            return {
                network: localNetwork,
                transactions: transactions,
            }
        })
    )) as NetworkTransactions[]

    const noChanges = transactionByNetwork.reduce((acc, { transactions }) => {
        acc += transactions.filter((transaction) => transaction.needChange).length
        return acc
    }, 0)
    if (noChanges == 0) {
        //early return
        console.log("No changes needed")
        return
    }
    const columns = ["needChange", "chainId", "contractName", "functionName", "args", "diff"]
    printTransactions(columns, transactionByNetwork)
    await executeTransactions(hre, taskArgs, transactionByNetwork)
}

const setPeer = async (localOApp: any, remoteOApp: any): Promise<Transaction[]> => {
    const oldPeer = await localOApp.peers(await remoteOApp.endpoint.eid())
    const newPeer = await remoteOApp.address
    const needChange = oldPeer !== newPeer
    const contractAddress = await localOApp.address
    const functionName = localOApp.setPeer.selector
    const args = [newPeer]
    const calldata = localOApp.interface.encodeFunctionData(functionName, args)
    const diff = needChange ? { oldValue: oldPeer, newValue: newPeer } : undefined
    return [{ needChange, chainId, contractAddress, functionName, args, calldata, diff }]
}

const setEnforcedOptions = async (localOApp: any, remoteOApp: any, enforcedOptions: any): Promise<Transaction[]> => {
    const contractAddress = await localOApp.address
    const endpointId = await localOApp.endpoint.eid()
    const txns: Transaction[] = []
    const packetTypes = Object.keys(enforcedOptions)
    for (const packet of packetTypes) {
        const packetType = parseInt(packet.at(-1) as string)
        const minGas = enforcedOptions[packet]
        const remoteChainId = await remoteOApp.endpoint.eid()
        const encodedOptions = await localContract.enforcedOptions(remoteChainId, packetType)
        const [version, curGas] = hre.ethers.utils.defaultAbiCoder.decode(["uint16", "uint256"], encodedOptions)
        const needChange = curGas !== minGas
        const functionName = localOApp.setEnforcedOptions.selector
        const options = hre.ethers.utils.solidityPack(["uint16", "uint256"], [3, minGas])
        const args = [remoteChainId, packetType, options]
        const calldata = localOApp.interface.encodeFunctionData(functionName, args)
        const diff = needChange ? { oldValue: cur, newValue: minGas } : undefined
        txns.push({ needChange, endpointId, contractAddress, functionName, args, calldata, diff })
    }
    return txns
}
