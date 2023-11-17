import * as ethers from "ethers"
import { Contract, ContractReceipt } from "ethers"
import EthersAdapter from "@gnosis.pm/safe-ethers-lib"
import SafeServiceClient from "@gnosis.pm/safe-service-client"
import Safe from "@gnosis.pm/safe-core-sdk"
import { LZ_APP_ABI } from "@/constants/abi"
import { LZ_ENDPOINTS } from "@/constants/endpoints"
import { MainnetEndpointId, TestnetEndpointId, SandboxEndpointId } from "@layerzerolabs/lz-definitions"
import { promptToProceed, arrayToCsv, getConfig } from "./helpers"
import path from "path"
import fs from "fs"
import { writeFile } from "fs/promises"

export interface ExecutableTransaction {
    contractName: string
    functionName: string
    args: any[]
    txArgs?: any
}

export interface Transaction {
    needChange: boolean
    chainId: string
    remoteChainId?: string
    contractAddress: string
    functionName: string
    args: any[]
    calldata?: string
    diff?: { [key: string]: { newValue: any; oldValue: any } }
}

export interface NetworkTransactions {
    network: string
    transactions: Transaction[]
}

const providerByNetwork: { [name: string]: ethers.providers.JsonRpcProvider } = {}
export const getProvider = (hre: any, network: string) => {
    if (!providerByNetwork[network]) {
        const networkUrl = hre.config.networks[network].url
        providerByNetwork[network] = new ethers.providers.JsonRpcProvider(networkUrl)
    }
    return providerByNetwork[network]
}

export const getWallet = (index: number) => ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "", `m/44'/60'/0'/0/${index}`)

const connectedWallets: { [key: string]: any } = {}
export const getConnectedWallet = (hre: any, network: string, walletIndex: number) => {
    const key = `${network}-${walletIndex}`
    if (!connectedWallets[key]) {
        const provider = getProvider(hre, network)
        const wallet = getWallet(walletIndex)
        connectedWallets[key] = wallet.connect(provider)
    }
    return connectedWallets[key]
}

const deploymentAddresses: { [key: string]: string } = {}
export const getDeploymentAddress = (network: string, contractName: string) => {
    const key = `${network}-${contractName}`
    if (!deploymentAddresses[key]) {
        deploymentAddresses[key] = getDeploymentAddresses(network)[contractName]
    }
    if (!deploymentAddresses[key]) {
        throw Error(`contract ${key} not found for network: ${network}`)
    }
    return deploymentAddresses[key]
}

const contracts: { [key: string]: any } = {}
export const getContract = async (hre: any, network: string, contractName: string) => {
    if (network == "hardhat") {
        return await hre.ethers.getContract(contractName)
    }

    const key = `${network}-${contractName}`
    if (!contracts[key]) {
        const contractAddress = getDeploymentAddress(network, contractName)
        const provider = getProvider(hre, network)
        const contractFactory = await getContractFactory(hre, contractName)
        const contract = contractFactory.attach(contractAddress)
        contracts[key] = contract.connect(provider)
    }
    return contracts[key]
}

export const getContractAt = async (hre: any, network: string, abi: any, contractAddress: string) => {
    const key = `${network}-${contractAddress}`
    if (!contracts[key]) {
        const provider = getProvider(hre, network)
        const contract = new Contract(contractAddress, abi, provider)
        contracts[key] = contract.connect(provider)
    }
    return contracts[key]
}

export const getWalletContract = async (hre: any, network: string, contractName: string, walletIndex: number = 0) => {
    const contract = await getContract(hre, network, contractName)
    const wallet = getConnectedWallet(hre, network, walletIndex)
    return contract.connect(wallet)
}

export const getWalletContractAt = async (hre: any, network: string, abi: any, contractAddress: string, walletIndex = 0) => {
    const contract = await getContractAt(hre, network, abi, contractAddress)
    const wallet = getConnectedWallet(hre, network, walletIndex)
    return contract.connect(wallet)
}

const contractFactories: { [name: string]: ethers.ContractFactory } = {}
const getContractFactory = async (hre: any, contractName: string) => {
    if (!contractFactories[contractName]) {
        contractFactories[contractName] = await hre.ethers.getContractFactory(contractName)
    }
    return contractFactories[contractName]
}

export const executeTransaction = async (
    hre: any,
    network: string,
    transaction: any,
    gasLimit?: any,
    contract?: any,
    abi?: any
): Promise<ContractReceipt> => {
    let walletContract
    if (contract) {
        walletContract = contract
    } else if (hre.ethers.utils.isAddress(transaction.contractName)) {
        walletContract = await getWalletContractAt(hre, network, abi, transaction.contractName, 0)
    } else {
        walletContract = await getWalletContract(hre, network, transaction.contractName, 0)
    }
    const gasPrice = await getProvider(hre, network).getGasPrice()
    const finalGasPrice = gasPrice.mul(10).div(8)
    return await (
        await walletContract[transaction.functionName](...transaction.args, {
            gasPrice: finalGasPrice,
            gasLimit: gasLimit !== undefined ? gasLimit : 200000,
            ...transaction.txArgs,
        })
    ).wait()
}

export async function executeTransactions(hre: any, taskArgs: any, transactionBynetwork: any[]) {
    const columns = ["needChange", "chainId", "remoteChainId", "contractName", "functionName", "args", "diff", "calldata"]

    const data = transactionBynetwork.reduce((acc, { network, transactions }) => {
        transactions.forEach((transaction: any) => {
            acc.push([
                network,
                ...columns.map((key) => {
                    if (typeof transaction[key] === "object") {
                        return JSON.stringify(transaction[key])
                    } else {
                        return transaction[key]
                    }
                }),
            ])
        })
        return acc
    }, [] as any)
    await writeFile("./transactions.csv", arrayToCsv(["network"].concat(columns), data))

    console.log("Full configuration is written at:")
    console.log(`file:/${process.cwd()}/transactions.csv`)

    const errs: any[] = []
    const print: any = {}
    let previousPrintLine = 0
    const printResult = () => {
        if (previousPrintLine) {
            process.stdout.moveCursor(0, -previousPrintLine)
        }
        if (Object.keys(print)) {
            previousPrintLine = Object.keys(print).length + 4
            console.table(Object.keys(print).map((network) => ({ network, ...print[network] })))
        }
    }

    if (taskArgs.n) {
        await promptToProceed("Would you like to Submit to gnosis?", taskArgs.noPrompt)
        const gnosisConfig = getConfig(taskArgs.gnosisConfigPath)
        await Promise.all(
            transactionBynetwork.map(async ({ network, transactions }) => {
                const transactionToCommit = transactions.filter((transaction: any) => transaction.needChange)
                print[network] = print[network] || { requests: `1/1` }
                print[network].current = `executeGnosisTransactions: ${transactionToCommit}`
                try {
                    await executeGnosisTransactions(hre, network, gnosisConfig, transactionToCommit)
                    print[network].requests = `1/1`
                    printResult()
                } catch (err: any) {
                    console.log(`Failing calling executeGnosisTransactions for network ${network} with err ${err}`)
                    errs.push({
                        network,
                        err,
                    })
                    print[network].current = err.message
                    print[network].err = true
                    printResult()
                }
            })
        )
    } else {
        await promptToProceed("Would you like to run these transactions?", taskArgs.noPrompt)
        await Promise.all(
            transactionBynetwork.map(async ({ network, transactions }) => {
                const transactionToCommit = transactions.filter((transaction: any) => transaction.needChange)

                let successTx = 0
                print[network] = print[network] || { requests: `${successTx}/${transactionToCommit.length}` }
                for (const transaction of transactionToCommit) {
                    print[network].current = `${transaction.contractName}.${transaction.functionName}`
                    printResult()
                    try {
                        const gasLimit = taskArgs.gasLimit
                        const tx = await executeTransaction(hre, network, transaction, gasLimit)
                        print[network].past = `${transaction.contractName}.${transaction.functionName} (${tx.transactionHash})`
                        successTx++
                        print[network].requests = `${successTx}/${transactionToCommit.length}`
                        printResult()
                    } catch (err: any) {
                        console.log(
                            `Failing calling ${transaction.contractName}.${transaction.functionName} for network ${network} with err ${err}`
                        )
                        console.log(err)
                        errs.push({
                            network,
                            err,
                        })
                        print[network].current = err
                        print[network].err = true
                        printResult()
                        break
                    }
                }
            })
        )
    }

    if (!errs.length) {
        console.log("Wired all networks successfully")
    } else {
        console.log(errs)
    }
}

export const executeGnosisTransactions = async (hre: any, network: string, gnosisConfig: any, transactions: Transaction[]) => {
    const signer = await getConnectedWallet(hre, network, 0)
    if (!gnosisConfig[network]) {
        throw Error(`Gnosis for ${network} not found or not supported`)
    }

    const { safeAddress, url } = gnosisConfig[network]
    console.log(`safeAddress[${safeAddress}] url[${url}]`)

    const safeService = new SafeServiceClient(url)
    const ethAdapter = new EthersAdapter({
        ethers: hre.ethers,
        signerOrProvider: signer,
    })

    const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress })
    const gnosisTransactions = transactions.map((tx) => ({ to: tx.contractAddress, data: tx.calldata!, value: "0" }))
    const nonce = await safeService.getNextNonce(safeAddress)
    const safeTransaction = await safeSdk.createTransaction(gnosisTransactions, { nonce })

    await safeSdk.signTransaction(safeTransaction)
    const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
    await safeService.proposeTransaction({
        safeAddress,
        safeTransaction,
        safeTxHash,
        senderAddress: signer.address,
    })
}

export const getDeploymentAddresses = (network: string, throwIfMissing: boolean = true): any => {
    const deploymentAddresses: { [key: string]: any } = {}
    const DEPLOYMENT_PATH = path.resolve("deployments")

    if (!fs.existsSync(DEPLOYMENT_PATH)) {
        return deploymentAddresses
    }

    let folderName = network
    if (network === "hardhat") {
        folderName = "localhost"
    }
    const networkFolderName = fs.readdirSync(DEPLOYMENT_PATH).filter((f: string) => f === folderName)[0]
    if (networkFolderName === undefined) {
        if (throwIfMissing) {
            throw new Error("missing deployment files for endpoint " + folderName)
        }
        return deploymentAddresses
    }

    const networkFolderPath = path.resolve(DEPLOYMENT_PATH, folderName)
    const files = fs.readdirSync(networkFolderPath).filter((f: string) => f.includes(".json"))
    files.forEach((file: string) => {
        const filepath = path.resolve(networkFolderPath, file)
        const data = JSON.parse(fs.readFileSync(filepath, "utf8"))
        const contractName = file.split(".")[0]
        deploymentAddresses[contractName] = data.address
    })

    return deploymentAddresses
}

export const getApplicationConfig = async (remoteNetwork: string, sendLibrary: any, receiveLibrary: any, applicationAddress: string) => {
    const remoteChainId = getLayerZeroChainId(remoteNetwork)
    const sendConfig = await sendLibrary.appConfig(applicationAddress, remoteChainId)
    let inboundProofLibraryVersion = sendConfig.inboundProofLibraryVersion
    let inboundBlockConfirmations = sendConfig.inboundBlockConfirmations.toNumber()

    if (receiveLibrary) {
        const receiveConfig = await receiveLibrary.appConfig(applicationAddress, remoteChainId)
        inboundProofLibraryVersion = receiveConfig.inboundProofLibraryVersion
        inboundBlockConfirmations = receiveConfig.inboundBlockConfirmations.toNumber()
    }
    return {
        remoteNetwork,
        inboundProofLibraryVersion,
        inboundBlockConfirmations,
        relayer: sendConfig.relayer,
        outboundProofType: sendConfig.outboundProofType,
        outboundBlockConfirmations: sendConfig.outboundBlockConfirmations.toNumber(),
        oracle: sendConfig.oracle,
    }
}

export const getEndpointAddress = (network: string): string => {
    return LZ_ENDPOINTS[network]
}

// expecting "chain-environment" eg. "ethereum-mainnet", "ethereum-testnet", "ethereum-sandbox"
export const getLayerZeroChainId = (network: string): string => {
    const [chainName, environment] = network.split("-")
    const chainIdEnum = getChainIdEnum(chainName, environment)
    if (environment == "mainnet") {
        return MainnetEndpointId[chainIdEnum as any]
    } else if (environment == "testnet") {
        return TestnetEndpointId[chainIdEnum as any]
    } else if (environment == "sandbox") {
        return SandboxEndpointId[chainIdEnum as any]
    } else {
        throw new Error("cannot find chainId")
    }
}

const getChainIdEnum = (chainName: string, environment: string): string => {
    return `${chainName.split("-")[0].toUpperCase()}_${environment.toUpperCase()}`
}

export const getContractInstance = async (hre: any, network: string, contractNameOrAddress: string) => {
    let contract
    if (hre.ethers.utils.isAddress(contractNameOrAddress)) {
        contract = await getContractAt(hre, network, LZ_APP_ABI, contractNameOrAddress)
    } else {
        contract = await getContract(hre, network, contractNameOrAddress)
    }
    return contract
}
