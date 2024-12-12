// TODO: Maybe use Stage or Environment imported
export type EnvironmentName = 'sandbox' | 'localnet' | 'local' | 'testnet' | 'mainnet'
export type TonDeployment = {
    name: ContractName
    network: string
    address: string
    compatibleVersions: string[]
    deployer: string
}
type ContractName =
    | 'AllStorages'
    | 'Controller'
    | 'Counter'
    | 'Dvn'
    | 'DvnProxy'
    | 'Executor'
    | 'ExecutorProxy'
    | 'PriceFeedCache'
    | 'PriceFeedCacheProxy'
    | 'SmlManager'
    | 'UlnManager'
const DEFAULT_PATH = '@layerzerolabs/lz-ton-sdk-v2/deployments'

const envToFolder = (env: EnvironmentName) => {
    switch (env) {
        case 'sandbox':
        case 'localnet':
        case 'local':
            return 'ton-sandbox-local'
        case 'testnet':
            return 'ton-testnet'
        case 'mainnet':
            return 'ton-mainnet'
    }
}

const envToFolderFallback = (env: EnvironmentName) => {
    switch (env) {
        case 'sandbox':
        case 'localnet':
        case 'local':
            return 'ton-localnet'
        case 'testnet':
            return 'ton-testnet'
        case 'mainnet':
            return 'ton-mainnet'
    }
}

/**
 *
 * @param env The environment name for which to fetch the deployment
 * @param name The name of the contract to fetch
 * @returns A deployment record
 */
export const getDeployment = (env: EnvironmentName, name: ContractName): TonDeployment => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${DEFAULT_PATH}/${envToFolder(env)}/${name}.json`) as TonDeployment
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${DEFAULT_PATH}/${envToFolderFallback(env)}/${name}.json`) as TonDeployment
    }
}
/**
 *
 * @param env The environment name for which to fetch the deployment
 * @param name The name of the contract to fetch
 * @param packageName The name of the package in which the deployment is located
 * @returns A deployment record
 */
export const getDeploymentFromPackage = (env: EnvironmentName, name: string, packageName: string): TonDeployment => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`@layerzerolabs/${packageName}/deployments/${envToFolder(env)}/${name}.json`) as TonDeployment
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(
            `@layerzerolabs/${packageName}/deployments/${envToFolderFallback(env)}/${name}.json`
        ) as TonDeployment
    }
}

/**
 *
 * @param env The environment name for which to fetch the address
 * @param name The name of the contract to fetch the address from
 * @returns A deployed contract address
 */
export const getDeploymentAddress = (env: EnvironmentName, name: ContractName): string =>
    getDeployment(env, name).address

/**
 *
 * @param env The environment name for which to fetch the address
 * @param name The name of the contract to fetch the address from
 * @param packageName The name of the package in which the deployment is located
 * @returns A deployed contract address
 */
export const getDeploymentAddressFromPackage = (env: EnvironmentName, name: string, packageName: string): string =>
    getDeploymentFromPackage(env, name, packageName).address
