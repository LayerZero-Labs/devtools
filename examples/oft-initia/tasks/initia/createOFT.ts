import { Chain, Stage, Network, EndpointVersion } from '@layerzerolabs/lz-definitions'
import { task, types } from 'hardhat/config'
import { deploy } from '@layerzerolabs/lz-initia-cli'
import config from '../../initia.config'
import { addModule } from '../utils/utils'

// steps for deploying contract:
// 1: Put move script in programs/oft/sources/
// 2: Create Move.toml in programs/oft/
//    [package]
//    name = "yourModuleName"
//    version = "0.0.0"
//    authors = []
//    [addresses]
//    yourModuleName = "_"
// 3: run script npx hardhat lz:oft:initia:create --module yourModuleName --stage testnet

export default task('lz:oft:initia:create', 'Creates a new OFT')
    .addParam('module', 'Name of the module to deploy', undefined, types.string)
    .addParam('stage', 'Deploy stage (mainnet or testnet)', 'testnet', types.string, true)
    .setAction(async ({ module, stage }) => {
        try {
            if (stage !== 'mainnet' && stage !== 'testnet') {
                throw new Error('Stage must be either "mainnet" or "testnet"')
            }

            const stageEnum = stage === 'mainnet' ? Stage.MAINNET : Stage.TESTNET
            const initiaNetwork: Network = `${Chain.INITIA}-${stageEnum}`

            // Add the module dynamically
            addModule(config, module, {
                modulePath: `programs/oft`,
                addresses: {
                    [module]: '_',
                },
            })

            await deploy(module, config, initiaNetwork, EndpointVersion.V2)

            console.log(`✅✅✅ Contract ${module} deployed successfully to ${stage} ✅✅✅`)
        } catch (error) {
            console.error('Deployment failed', error)
        }
    })
