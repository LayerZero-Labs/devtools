import { getContract, getContractAt, getChainId } from "./utils/crossChainHelper";
import { logError } from "./utils/helpers";

export const LzAppAbi = [
	"function useCustomAdapterParams() public view returns (bool) ",
	"function trustedRemoteLookup(uint16) public view returns (bytes)",
	"function minDstGasLookup(uint16, uint16) public view returns (uint)",
	"function defaultFeeBp() public view returns (uint16)",
	"function chainIdToFeeBps(uint16) public view returns (uint16, bool)",
    "function withdrawalFeeBps() public view returns (uint16)",
];

module.exports = async function (taskArgs, hre) {
    const localNetworks = taskArgs.chains.split(",");
    const remoteNetworks = localNetworks;
    const contractAddresses = taskArgs?.addresses?.split(",");

	let checkWireAllConfigObj = {}
    await Promise.all(
        localNetworks.map(async (localNetwork, localIndex) => {
            checkWireAllConfigObj[localNetwork] = {
                useCustomAdapterParams: {},
                withdrawalFeeBps: {},
                minDstGasLookup: {},
                trustedRemoteLookup: {}
            }

            checkWireAllConfigObj[localNetwork].useCustomAdapterParams["useCustomAdapterParams"] = "";
            checkWireAllConfigObj[localNetwork].withdrawalFeeBps["withdrawalFeeBps"] = "";
            checkWireAllConfigObj[localNetwork].minDstGasLookup[localNetwork] = "";
            checkWireAllConfigObj[localNetwork].trustedRemoteLookup[localNetwork] = "";

            let localContractNameOrAddress;
            if(taskArgs?.proxyChain && taskArgs?.proxyContract && localNetwork == taskArgs?.proxyChain) {
                localContractNameOrAddress = taskArgs?.proxyContract
            } else if(taskArgs?.contract !== undefined) {
                localContractNameOrAddress = taskArgs.contract
            } else if(contractAddresses !== undefined) {
                localContractNameOrAddress = contractAddresses[localIndex]
            }

            if (localContractNameOrAddress === undefined && contractAddresses === undefined) {
                logError(`Invalid wire up config for localContractNameOrAddress.`);
                return;
            }

            if(taskArgs.u) checkWireAllConfigObj[localNetwork].useCustomAdapterParams["useCustomAdapterParams"] = await getUseCustomAdapterParams(hre, localNetwork, localContractNameOrAddress);
            if(taskArgs.wfb) checkWireAllConfigObj[localNetwork].withdrawalFeeBps["withdrawalFeeBps"] = await getWithdrawalFeeBps(hre, localNetwork, localContractNameOrAddress);

            await Promise.all(
                remoteNetworks.map(async (remoteNetwork, remoteIndex) => {

                    let remoteContractNameOrAddress;
                    if(taskArgs?.proxyChain && taskArgs?.proxyContract && remoteNetwork == taskArgs?.proxyChain) {
                        remoteContractNameOrAddress = taskArgs?.proxyContract
                    } else if(taskArgs?.contract !== undefined) {
                        remoteContractNameOrAddress = taskArgs.contract
                    } else if(contractAddresses !== undefined) {
                        remoteContractNameOrAddress = contractAddresses[remoteIndex]
                    }

                    if (remoteContractNameOrAddress === undefined && contractAddresses === undefined) {
                        logError(`Invalid wire up config for remoteContractNameOrAddress.`);
                        return;
                    }

                    checkWireAllConfigObj[localNetwork].minDstGasLookup[remoteNetwork] = await getMinDstGas(hre, localNetwork, localContractNameOrAddress, getChainId(remoteNetwork, taskArgs.e));
                    if(taskArgs.t) checkWireAllConfigObj[localNetwork].trustedRemoteLookup[remoteNetwork] = await getTrustedRemote(hre, localNetwork, localContractNameOrAddress, remoteNetwork, remoteContractNameOrAddress, getChainId(remoteNetwork, taskArgs.e));
                    if(taskArgs.m) checkWireAllConfigObj[localNetwork].minDstGasLookup[remoteNetwork] = await getMinDstGas(hre, localNetwork, localContractNameOrAddress, getChainId(remoteNetwork, taskArgs.e));
                })
            );
        })
    );

    if(taskArgs.u) {
        console.log("Use Custom Adapter Params Table");
        let useCustomAdapterParamsTable = Object.keys(checkWireAllConfigObj).map((network) => ({ [network]: checkWireAllConfigObj[network].useCustomAdapterParams}))
        console.table(useCustomAdapterParamsTable.reduce(((r, c) => Object.assign(r, c)), {}));
    }

    if(taskArgs.wfb) {
        console.log("Withdrawal Fee Bps Lookup Table");
        let minDstGasLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({ [network]: checkWireAllConfigObj[network].withdrawalFeeBps}))
        console.table(minDstGasLookupTable.reduce(((r, c) => Object.assign(r, c)), {}));
    }

    if(taskArgs.t) {
        console.log("Trusted Remote Lookup Table");
        let trustedRemoteLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({ [network]: checkWireAllConfigObj[network].trustedRemoteLookup}))
        console.table(trustedRemoteLookupTable.reduce(((r, c) => Object.assign(r, c)), {}));
    }

    if(taskArgs.m) {
        console.log("Min Dst Gas Lookup Table");
        let minDstGasLookupTable = Object.keys(checkWireAllConfigObj).map((network) => ({ [network]: checkWireAllConfigObj[network].minDstGasLookup}))
        console.table(minDstGasLookupTable.reduce(((r, c) => Object.assign(r, c)), {}));
    }
}

async function getUseCustomAdapterParams(hre: any, localNetwork: string, localContractNameOrAddress: string): Promise<any> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
	return await localContract.useCustomAdapterParams();
}

async function getWithdrawalFeeBps(hre: any, localNetwork: string, localContractNameOrAddress: string): Promise<any> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
	let withdrawalFeeBps;
	try {
	    withdrawalFeeBps = await localContract.withdrawalFeeBps();
	} catch(e) {
	    withdrawalFeeBps = "N/A"
	}
	return withdrawalFeeBps;
}


async function getMinDstGas(hre: any, localNetwork: string, localContractNameOrAddress: string, remoteChainId: number): Promise<string> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}
    let packetTypes: string[] = [];
    let minGasPk_0 = await localContract.minDstGasLookup(remoteChainId, 0)
    let minGasPk_1 = await localContract.minDstGasLookup(remoteChainId, 1)
    packetTypes.push(minGasPk_0.toNumber());
    packetTypes.push(minGasPk_1.toNumber());
    return packetTypes.toString();
}

async function getTrustedRemote(hre: any, localNetwork: string, localContractNameOrAddress: string, remoteNetwork: string, remoteContractNameOrAddress: string, remoteChainId: number): Promise<any> {
	let localContract;
	if (hre.ethers.utils.isAddress(localContractNameOrAddress)) {
		localContract = await getContractAt(hre, localNetwork, LzAppAbi, localContractNameOrAddress);
	} else {
		localContract = await getContract(hre, localNetwork, localContractNameOrAddress);
	}

    let remoteContract;
    if (hre.ethers.utils.isAddress(remoteContractNameOrAddress)) {
        remoteContract = await getContractAt(hre, remoteNetwork, LzAppAbi, remoteContractNameOrAddress);
    } else {
        remoteContract = await getContract(hre, remoteNetwork, remoteContractNameOrAddress);
    }

	const remoteContractAddress = await remoteContract.address;
	const desiredTrustedRemote = hre.ethers.utils.solidityPack(["bytes"], [remoteContractAddress + localContract.address.substring(2)]);
	const currentTrustedRemote = await localContract.trustedRemoteLookup(remoteChainId);
	return currentTrustedRemote != desiredTrustedRemote ? "🟥" : "🟩";
}