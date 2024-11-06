import { Chain, Stage, Network, EndpointVersion } from '@layerzerolabs/lz-definitions'
import { task } from 'hardhat/config'
import { deploy } from '@layerzerolabs/lz-initia-cli'
import config from '../../initia.config'

task('lz:oft:initia:create', 'Creates a new OFT').setAction(async () => {
    try {
        const initiaNetwork: Network = `${Chain.INITIA}-${Stage.TESTNET}`
        // const initiaNetwork: Network = 'initia-testnet'

        await deploy('MyOFT', config, initiaNetwork, EndpointVersion.V2)

        console.log('Contract deployed successfully')
    } catch (error) {
        console.error('Deployment failed', error)
    }
})
