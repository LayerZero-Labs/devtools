import { Transaction, getLayerZeroChainId, getContractInstance } from "./crossChainHelper"
import OAPP_ARTIFACT from "@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/OApp.sol/OApp.json"
import { ethers } from "ethers"

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

export function getAndReturnContract(contractNameOrAddress: string, environment: any) {
    if (ethers.utils.isAddress(contractNameOrAddress)) {
        const oappFactory = ethers.getContractFactory(OAPP_ARTIFACT.abi)
        return oappFactory.attach(contractNameOrAddress).connect(environment.provider)
    } else {
        return await environment.getContract(contractNameOrAddress, environment.provider)
    }
}

export function getOAppContract(chain: string, environment: any, WIRE_UP_CONFIG: any) {
    return getAndReturnContract(getContractNameOrAddress(chain, WIRE_UP_CONFIG), environment)
}
