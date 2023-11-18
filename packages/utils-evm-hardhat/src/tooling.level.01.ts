//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                Iteration 1: Minimal tooling
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

import type { HardhatRuntimeEnvironment } from "hardhat/types"
import { createGetNetworkEnvironment } from "./runtime"
import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers"

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                     The required utilities
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

type PerNetwork<T> = Record<string, T>

type PerNetworkPair<T> = PerNetwork<PerNetwork<T>>

declare const networkBasedConfigurationValue: <V>(networkName: string, property: string) => V

declare const networkPairBasedConfigurationValue: <V>(sourceNetworkName: string, destinationNetworkName: string, property: string) => V

declare const forAllNetworks: <T>(f: (networkName: string) => T | null | undefined | Promise<T | null | undefined>) => Promise<PerNetwork<T>>

declare const withContract: (contractName: string) => <T>(f: (networkName: string) => T | Promise<T>) => (networkName: string) => Promise<T>

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                      The resulting code
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

/**
 * Example flow 1
 *
 * We are setting a configuration property on an OApp
 */
async function exampleFlow1(hre: HardhatRuntimeEnvironment) {
    const getNetworkEnvironment = createGetNetworkEnvironment(hre)

    const receipts: PerNetwork<TransactionReceipt> = await forAllNetworks(async (networkName) => {
        const environment = await getNetworkEnvironment(networkName)
        const contract = environment.getContract("MyOApp", environment.provider.getSigner())

        // At this point the question is: where does this value come from?
        //
        // The answer I believe is: we don't know and we can only guide people
        //
        // Instead of forcing external teams to use a particular way of doing this,
        // we should provide several options tailored to the use-case, e.g.:
        //
        // - Option 1: I have one OApp on every network - in this case you might want to augment your HardhatNetworkUserConfig just like we do with endpointId
        // - Option 2: I have multiple OApps on every network - ...
        //
        // As a helper we could provide a configuration utilities to simplify some of this
        // but we cannot possibly hope to cater to all the styles & environments
        const value = networkBasedConfigurationValue(networkName, "configurationProperty")

        const transactionResponse: TransactionResponse = await contract.setConfigurationProperty(value)
        const transactionReceipt: TransactionReceipt = await transactionResponse.wait()

        return transactionReceipt
    })

    console.table(receipts)
}

/**
 * Example flow 3
 *
 * We are setting a configuration property on an OApp
 * once for every network combination
 */
async function exampleFlow2(hre: HardhatRuntimeEnvironment) {
    const getNetworkEnvironment = createGetNetworkEnvironment(hre)

    const receipts: PerNetworkPair<TransactionReceipt> = await forAllNetworks(async (sourceNetworkName) => {
        const sourceEnvironment = await getNetworkEnvironment(sourceNetworkName)
        const contract = sourceEnvironment.getContract("MyOApp", sourceEnvironment.provider.getSigner())

        return forAllNetworks(async (destinationNetworkName) => {
            // In our second example we need a per-network-combination configuration value
            // so we cannot even reasonably use the HardhatNetworkUserConfig without it exploding
            const value = networkPairBasedConfigurationValue(sourceNetworkName, destinationNetworkName, "configurationProperty")

            const transactionResponse: TransactionResponse = await contract.setConfigurationProperty(destinationNetworkName, value)
            const transactionReceipt: TransactionReceipt = await transactionResponse.wait()

            return transactionReceipt
        })
    })

    console.table(receipts)
}

/**
 * Example flow 2
 *
 * We are setting a configuration property on an OApp
 * once for every network combination but OApp only exists on some networks
 */
async function exampleFlow3(hre: HardhatRuntimeEnvironment) {
    const getNetworkEnvironment = createGetNetworkEnvironment(hre)
    const withOApp = withContract("MyOApp")

    const receipts: PerNetworkPair<TransactionReceipt> = await forAllNetworks(
        withOApp(async (sourceNetworkName) => {
            const sourceEnvironment = await getNetworkEnvironment(sourceNetworkName)
            const contract = sourceEnvironment.getContract("MyOApp", sourceEnvironment.provider.getSigner())

            return forAllNetworks(
                withOApp(async (destinationNetworkName) => {
                    // In our second example we need a per-network-combination configuration value
                    // so we cannot even reasonably use the HardhatNetworkUserConfig without it exploding
                    const value = networkPairBasedConfigurationValue(sourceNetworkName, destinationNetworkName, "configurationProperty")

                    const transactionResponse: TransactionResponse = await contract.setConfigurationProperty(destinationNetworkName, value)
                    const transactionReceipt: TransactionReceipt = await transactionResponse.wait()

                    return transactionReceipt
                })
            )
        })
    )

    console.table(receipts)
}
