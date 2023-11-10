import { getContract, getContractAt, getLayerZeroChainId } from "./utils/crossChainHelper"
import { logError } from "./utils/helpers"
import { LZ_APP_ABI } from "./constants/abi"

export default async function (taskArgs: any, hre: any) {
    const localNetworks = taskArgs.chains.split(",")
    const remoteNetworks = localNetworks
    const contractAddresses = taskArgs?.addresses?.split(",")

    const checkWireAllConfigObj: { [key: string]: any } = {}
    await Promise.all(
        localNetworks.map(async (localNetwork: string, localIndex: number) => {
            checkWireAllConfigObj[localNetwork] = {
                useCustomAdapterParams: {},
                withdrawalFeeBps: {},
                minDstGasLookup: {},
                trustedRemoteLookup: {},
            }

            checkWireAllConfigObj[localNetwork].useCustomAdapterParams["useCustomAdapterParams"] = ""
            checkWireAllConfigObj[localNetwork].withdrawalFeeBps["withdrawalFeeBps"] = ""
            checkWireAllConfigObj[localNetwork].minDstGasLookup[localNetwork] = ""
            checkWireAllConfigObj[localNetwork].trustedRemoteLookup[localNetwork] = ""

            let localContractNameOrAddress: any
            if (taskArgs?.proxyChain && taskArgs?.proxyContract && localNetwork == taskArgs?.proxyChain) {
                localContractNameOrAddress = taskArgs?.proxyContract
            } else if (taskArgs?.contract !== undefined) {
                localContractNameOrAddress = taskArgs.contract
            } else if (contractAddresses !== undefined) {
                localContractNameOrAddress = contractAddresses[localIndex]
            }

            if (localContractNameOrAddress === undefined && contractAddresses === undefined) {
                logError(`Invalid wire up config for localContractNameOrAddress.`)
                return
            }

            if (taskArgs.u)
                checkWireAllConfigObj[localNetwork].useCustomAdapterParams["useCustomAdapterParams"] = await getUseCustomAdapterParams(
                    hre,
                    localNetwork,
                    localContractNameOrAddress
                )
            if (taskArgs.wfb)
                checkWireAllConfigObj[localNetwork].withdrawalFeeBps["withdrawalFeeBps"] = await getWithdrawalFeeBps(
                    hre,
                    localNetwork,
                    localContractNameOrAddress
                )

            await Promise.all(
                remoteNetworks.map(async (remoteNetwork: string, remoteIndex: number) => {
                    let remoteContractNameOrAddress
                    if (taskArgs?.proxyChain && taskArgs?.proxyContract && remoteNetwork == taskArgs?.proxyChain) {
                        remoteContractNameOrAddress = taskArgs?.proxyContract
                    } else if (taskArgs?.contract !== undefined) {
                        remoteContractNameOrAddress = taskArgs.contract
                    } else if (contractAddresses !== undefined) {
                        remoteContractNameOrAddress = contractAddresses[remoteIndex]
                    }

                    if (remoteContractNameOrAddress === undefined && contractAddresses === undefined) {
                        logError(`Invalid wire up config for remoteContractNameOrAddress.`)
                        return
                    }

                    if (taskArgs.t)
                        checkWireAllConfigObj[localNetwork].trustedRemoteLookup[remoteNetwork] = await getTrustedRemote(
                            hre,
                            localNetwork,
                            localContractNameOrAddress,
                            remoteNetwork,
                            remoteContractNameOrAddress
                        )
                    if (taskArgs.m)
                        checkWireAllConfigObj[localNetwork].minDstGasLookup[remoteNetwork] = await getMinDstGas(
                            hre,
                            localNetwork,
                            localContractNameOrAddress,
                            remoteNetwork
                        )
                })
            )
        })
    )

    if (taskArgs.u) {
        console.log("Use Custom Adapter Params Table")
        const useCustomAdapterParamsTable = Object.keys(checkWireAllConfigObj).map((network) => ({
            [network]: checkWireAllConfigObj[network].useCustomAdapterParams,
        }))
        console.table(useCustomAdapterParamsTable.reduce((r, c) => Object.assign(r, c), {}))
    }

    if (taskArgs.wfb) {
        console.log("Withdrawal Fee Bps Lookup Table")
        const minDstGasLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({
            [network]: checkWireAllConfigObj[network].withdrawalFeeBps,
        }))
        console.table(minDstGasLookupTable.reduce((r, c) => Object.assign(r, c), {}))
    }

    if (taskArgs.t) {
        console.log("Trusted Remote Lookup Table")
        const trustedRemoteLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({
            [network]: checkWireAllConfigObj[network].trustedRemoteLookup,
        }))
        console.table(trustedRemoteLookupTable.reduce((r, c) => Object.assign(r, c), {}))
    }

    if (taskArgs.m) {
        console.log("Min Dst Gas Lookup Table")
        const minDstGasLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({
            [network]: checkWireAllConfigObj[network].minDstGasLookup,
        }))
        console.table(minDstGasLookupTable.reduce((r, c) => Object.assign(r, c), {}))
    }
}

async function getUseCustomAdapterParams(hre: any, localNetwork: string, localContractNameOrAddress: string): Promise<any> {
    let localContract
    if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
        localContract = await getContractAt(hre, localNetwork, LZ_APP_ABI, localContractNameOrAddress)
    } else {
        localContract = await getContract(hre, localNetwork, localContractNameOrAddress)
    }
    return await localContract.useCustomAdapterParams()
}

async function getWithdrawalFeeBps(hre: any, localNetwork: string, localContractNameOrAddress: string): Promise<any> {
    let localContract
    if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
        localContract = await getContractAt(hre, localNetwork, LZ_APP_ABI, localContractNameOrAddress)
    } else {
        localContract = await getContract(hre, localNetwork, localContractNameOrAddress)
    }
    let withdrawalFeeBps
    try {
        withdrawalFeeBps = await localContract.withdrawalFeeBps()
    } catch (e) {
        withdrawalFeeBps = "N/A"
    }
    return withdrawalFeeBps
}

async function getMinDstGas(
    hre: any,
    localNetwork: string,
    localContractNameOrAddress: string,
    remoteNetwork: string
): Promise<{ PT_0: string; PT_1: string } | string> {
    let localContract
    if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
        localContract = await getContractAt(hre, localNetwork, LZ_APP_ABI, localContractNameOrAddress)
    } else {
        localContract = await getContract(hre, localNetwork, localContractNameOrAddress)
    }
    if (localNetwork === remoteNetwork) return ""
    const remoteChainId = getLayerZeroChainId(remoteNetwork)
    const minGasPk_0 = await localContract.minDstGasLookup(remoteChainId, 0)
    const minGasPk_1 = await localContract.minDstGasLookup(remoteChainId, 1)
    const packetTypes = {
        PT_0: minGasPk_0.toString(),
        PT_1: minGasPk_1.toString(),
    }
    return packetTypes
}

async function getTrustedRemote(
    hre: any,
    localNetwork: string,
    localContractNameOrAddress: string,
    remoteNetwork: string,
    remoteContractNameOrAddress: string
): Promise<any> {
    let localContract
    if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
        localContract = await getContractAt(hre, localNetwork, LZ_APP_ABI, localContractNameOrAddress)
    } else {
        localContract = await getContract(hre, localNetwork, localContractNameOrAddress)
    }

    let remoteContract
    if (hre.ethers.utils.isAddress(remoteContractNameOrAddress)) {
        remoteContract = await getContractAt(hre, remoteNetwork, LZ_APP_ABI, remoteContractNameOrAddress)
    } else {
        remoteContract = await getContract(hre, remoteNetwork, remoteContractNameOrAddress)
    }

    const remoteContractAddress = await remoteContract.address
    const desiredTrustedRemote = hre.ethers.utils.solidityPack(["bytes"], [remoteContractAddress + localContract.address.substring(2)])
    const remoteChainId = getLayerZeroChainId(remoteNetwork)
    const currentTrustedRemote = await localContract.trustedRemoteLookup(remoteChainId)
    return currentTrustedRemote != desiredTrustedRemote ? (localNetwork === remoteNetwork ? "" : "🟥") : "🟩"
}
