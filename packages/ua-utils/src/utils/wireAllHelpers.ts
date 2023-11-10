import { Transaction, getLayerZeroChainId, getContractInstance } from "./crossChainHelper"

export async function setUseCustomAdapterParams(
    hre: any,
    localNetwork: string,
    localContractNameOrAddress: string,
    useCustom: boolean
): Promise<Transaction[]> {
    const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
    const cur = await localContract.useCustomAdapterParams()
    const needChange = cur !== useCustom

    // function setUseCustomAdapterParams(bool _useCustomAdapterParams)
    const functionName = "setUseCustomAdapterParams"
    const params = ["bool"]
    const args = [useCustom]

    const tx: any = {
        needChange,
        chainId: getLayerZeroChainId(localNetwork),
        contractName: localContractNameOrAddress,
        functionName: functionName,
        args: args,
        calldata: localContract.interface.encodeFunctionData(functionName, args),
    }
    if (tx.needChange) {
        tx.diff = JSON.stringify({ useCustomAdapterParams: { oldValue: cur, newValue: useCustom } })
    }
    return [tx]
}

export async function setMinDstGas(
    hre: any,
    localNetwork: string,
    localContractNameOrAddress: string,
    minDstGasConfig: any,
    remoteChainId: string
): Promise<Transaction[]> {
    const txns: Transaction[] = []
    const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
    const packetTypes = Object.keys(minDstGasConfig)
    for (const packet of packetTypes) {
        const packetType = parseInt(packet.at(-1) as string)
        const minGas = minDstGasConfig[packet]
        const cur = (await localContract.minDstGasLookup(remoteChainId, packetType)).toNumber()
        const needChange = cur !== minGas

        // function setMinDstGas(uint16 _dstChainId, uint16 _packetType, uint _minGas)
        const functionName = "setMinDstGas"
        const params = ["uint16", "uint16", "uint256"]
        const args = [remoteChainId, packetType, minGas]

        const tx: any = {
            needChange,
            chainId: getLayerZeroChainId(localNetwork),
            contractName: localContractNameOrAddress,
            functionName,
            args: args,
            calldata: localContract.interface.encodeFunctionData(functionName, args),
        }
        if (tx.needChange) {
            tx.diff = JSON.stringify({ oldValue: cur, newValue: minGas })
        }
        txns.push(tx)
    }
    return txns
}

export async function setTrustedRemote(
    hre: any,
    localNetwork: string,
    localContractNameOrAddress: string,
    remoteNetwork: string,
    remoteContractNameOrAddress: string
): Promise<Transaction[]> {
    const localContract = await getContractInstance(hre, localNetwork, localContractNameOrAddress)
    const remoteContract = await getContractInstance(hre, remoteNetwork, remoteContractNameOrAddress)

    const remoteContractAddress = await remoteContract.address
    const desiredTrustedRemote = hre.ethers.utils.solidityPack(["bytes"], [remoteContractAddress + localContract.address.substring(2)])

    const remoteChainId = getLayerZeroChainId(remoteNetwork)
    const cur = await localContract.trustedRemoteLookup(remoteChainId)
    const needChange = cur != desiredTrustedRemote

    // function setTrustedRemote(uint16 _srcChainId, bytes calldata _path)
    const functionName = "setTrustedRemote"
    const params = ["uint16", "bytes"]
    const args = [remoteChainId, desiredTrustedRemote]

    const tx: any = {
        needChange,
        chainId: getLayerZeroChainId(localNetwork),
        contractName: localContractNameOrAddress,
        functionName: functionName,
        args: args,
        calldata: localContract.interface.encodeFunctionData(functionName, args),
    }
    if (tx.needChange) {
        tx.diff = JSON.stringify({ trustedRemote: { oldValue: cur, newValue: desiredTrustedRemote } })
    }
    return [tx]
}

export function getContractNameOrAddress(chain: string, WIRE_UP_CONFIG: any) {
    let contractNameOrAddress
    const proxyChain = WIRE_UP_CONFIG?.proxyContractConfig?.chain
    if (proxyChain === chain) {
        if (WIRE_UP_CONFIG?.proxyContractConfig?.name) {
            contractNameOrAddress = WIRE_UP_CONFIG?.proxyContractConfig?.name
        } else if (WIRE_UP_CONFIG?.proxyContractConfig?.address) {
            contractNameOrAddress = WIRE_UP_CONFIG?.proxyContractConfig?.address
        }
    } else {
        if (WIRE_UP_CONFIG?.contractConfig?.name) {
            contractNameOrAddress = WIRE_UP_CONFIG?.contractConfig?.name
        } else if (WIRE_UP_CONFIG?.chainConfig?.[chain]?.name) {
            contractNameOrAddress = WIRE_UP_CONFIG?.chainConfig?.[chain]?.name
        } else if (WIRE_UP_CONFIG?.chainConfig?.[chain]?.address) {
            contractNameOrAddress = WIRE_UP_CONFIG?.chainConfig?.[chain]?.address
        }
    }
    return contractNameOrAddress
}
