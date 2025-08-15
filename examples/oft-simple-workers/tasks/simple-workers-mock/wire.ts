import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'

import { setReceiveConfig } from './utils/setReceiveConfig'
import { setSendConfig } from './utils/setSendConfig'

const logger = createLogger()

interface WireSimpleWorkersArgs {
    oappConfig: string
    contractName?: string
}

task('lz:oapp:wire:simple-workers', 'Wire all pathways to use Simple Workers (SimpleDVNMock and SimpleExecutorMock)')
    .addParam('oappConfig', 'Path to the LayerZero config file')
    .addOptionalParam('contractName', 'Name of the contract in deployments (defaults to reading from config)')
    .setAction(async (args: WireSimpleWorkersArgs, hre: HardhatRuntimeEnvironment) => {
        const { oappConfig } = args

        logger.info(`Loading LayerZero config from: ${oappConfig}`)

        // Import the config file
        const configPath = hre.config.paths.root + '/' + oappConfig
        delete require.cache[require.resolve(configPath)]
        const config = require(configPath).default

        const getHreByEid = createGetHreByEid()

        // Track processed pathways
        const processedPathways: string[] = []
        const skippedPathways: string[] = []

        logger.info('\nAnalyzing pathways for Simple Workers configuration...\n')

        // Process each connection
        for (const connection of config.connections) {
            const srcEid = connection.from.eid
            const dstEid = connection.to.eid
            const pathwayId = `${srcEid} → ${dstEid}`

            // Check if this pathway should use Simple Workers
            // We look for empty or missing DVN configurations
            const sendDVNs = connection.config?.sendConfig?.ulnConfig?.requiredDVNs || []
            const receiveDVNs = connection.config?.receiveConfig?.ulnConfig?.requiredDVNs || []

            if (sendDVNs.length > 0 || receiveDVNs.length > 0) {
                skippedPathways.push(`${pathwayId} (has existing DVN configuration)`)
                continue
            }

            logger.info(`Configuring Simple Workers for pathway: ${pathwayId}`)

            try {
                // Get HREs for both chains
                const srcHre = await getHreByEid(srcEid)
                const dstHre = await getHreByEid(dstEid)

                // Get contract names (use from config or fallback to arg)
                const srcContractName = connection.from.contractName || args.contractName
                const dstContractName = connection.to.contractName || args.contractName

                if (!srcContractName || !dstContractName) {
                    throw new Error('Contract name not specified in config or arguments')
                }

                // Get signers
                const srcSigner = (await srcHre.ethers.getSigners())[0]
                const dstSigner = (await dstHre.ethers.getSigners())[0]

                // === Configure Send Side (Source Chain) ===
                logger.info(`  Setting send config on chain ${srcEid}...`)

                // Get contracts on source chain
                const srcContractDep = await srcHre.deployments.get(srcContractName)
                const srcContract = new Contract(srcContractDep.address, srcContractDep.abi, srcSigner)

                const srcEndpointDep = await srcHre.deployments.get('EndpointV2')
                const srcEndpointContract = new Contract(srcEndpointDep.address, srcEndpointDep.abi, srcSigner)

                const srcSendLibDep = await srcHre.deployments.get('SendUln302')
                const srcDvnDep = await srcHre.deployments.get('SimpleDVNMock')
                const srcExecutorDep = await srcHre.deployments.get('SimpleExecutorMock')

                await setSendConfig(
                    srcEndpointContract,
                    {
                        oappAddress: srcContract.address,
                        sendLibrary: srcSendLibDep.address,
                        dvnAddress: srcDvnDep.address,
                        executorAddress: srcExecutorDep.address,
                        provider: srcHre.ethers.provider,
                    },
                    { dstEid }
                )

                // === Configure Receive Side (Destination Chain) ===
                logger.info(`  Setting receive config on chain ${dstEid}...`)

                // Get contracts on destination chain
                const dstContractDep = await dstHre.deployments.get(dstContractName)
                const dstContract = new Contract(dstContractDep.address, dstContractDep.abi, dstSigner)

                const dstEndpointDep = await dstHre.deployments.get('EndpointV2')
                const dstEndpointContract = new Contract(dstEndpointDep.address, dstEndpointDep.abi, dstSigner)

                const dstReceiveLibDep = await dstHre.deployments.get('ReceiveUln302')
                const dstDvnDep = await dstHre.deployments.get('SimpleDVNMock')
                const dstExecutorDep = await dstHre.deployments.get('SimpleExecutorMock')

                await setReceiveConfig(
                    dstEndpointContract,
                    {
                        oappAddress: dstContract.address,
                        receiveLibrary: dstReceiveLibDep.address,
                        dvnAddress: dstDvnDep.address,
                        executorAddress: dstExecutorDep.address,
                        provider: dstHre.ethers.provider,
                    },
                    { srcEid }
                )

                processedPathways.push(pathwayId)
                logger.info(`  ✓ Simple Workers configured for ${pathwayId}\n`)
            } catch (error) {
                logger.error(`Failed to configure Simple Workers for ${pathwayId}:`, error)
                throw error
            }
        }

        // Summary
        logger.info('\n========================================')
        logger.info('Simple Workers Configuration Summary')
        logger.info('========================================')

        if (processedPathways.length > 0) {
            logger.info(`\nConfigured ${processedPathways.length} pathway(s):`)
            processedPathways.forEach((pathway) => logger.info(`  ✓ ${pathway}`))
        }

        if (skippedPathways.length > 0) {
            logger.info(`\nSkipped ${skippedPathways.length} pathway(s):`)
            skippedPathways.forEach((pathway) => logger.info(`  - ${pathway}`))
        }

        if (processedPathways.length === 0) {
            logger.warn(
                '\nNo pathways were configured. All pathways either have existing DVN configurations or encountered errors.'
            )
        } else {
            logger.info('\nSimple Workers configuration complete!')
            logger.info('You can now send messages using the --simple-workers flag.')
        }
    })
