// import { Chain, Stage, Network, EndpointVersion } from '@layerzerolabs/lz-definitions'
import { deploy } from '@layerzerolabs/lz-initia-cli'
import { MnemonicKey } from '@initia/initia.js'
import config from '../../initia.config'
import {
    Chain,
    chainAndStageToNetwork,
    Environment,
    Stage,
    EndpointVersion,
    Network,
} from '@layerzerolabs/lz-definitions'

export const deployOFT = async () => {
    try {
        const initiaNetwork: Network = `${Chain.INITIA}-${Stage.TESTNET}`
        // const initiaNetwork: Network = 'initia-testnet'
        const networkKey = chainAndStageToNetwork(Chain.INITIA, Stage.TESTNET, Environment.TESTNET)
        const mnemonicKey =
            typeof config.defaultDeployer === 'object'
                ? config.defaultDeployer[networkKey as keyof typeof config.defaultDeployer]
                : config.defaultDeployer ?? (null as unknown as MnemonicKey)

        if (!mnemonicKey) {
            throw new Error('No deployer found')
        } else {
            console.log('wallet address', mnemonicKey.accAddress)
        }

        await deploy('MyOFT', config, initiaNetwork, EndpointVersion.V2)

        console.log('Contract deployed successfully')
    } catch (error) {
        console.error('Deployment failed', error)
    }
}

if (require.main === module) {
    deployOFT()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}
