import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { formatEid } from '@layerzerolabs/devtools'
import { wrapEIP1193Provider } from '@layerzerolabs/devtools-evm-hardhat'
import assert from 'assert'
import { Contract } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { createLogger, printRecord } from '@layerzerolabs/io-devtools'

const DEFAULT_NATIVE_DECIMALS_RATE = '18' //ethers.utils.parseUnits('1', 18).toString()

/**
 * This `deploy` function will deploy and configure LayerZero EndpointV2.  This includes:
 * - EndpointV2
 * - SendUln302
 * - ReceiveUln302
 * - ReadLib
 * - PriceFeed
 * - Executor
 * - ExecutorFeeLib
 * - DVN
 * - DVNFeeLib
 *
 * @param {HardhatRuntimeEnvironment} env
 */
export const createDeployEndpointV2 =
    (): DeployFunction =>
    async ({ getUnnamedAccounts, deployments, network }: HardhatRuntimeEnvironment) => {
        assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

        const [deployer] = await getUnnamedAccounts()
        assert(deployer, 'Missing deployer')
        const signer = wrapEIP1193Provider(network.provider).getSigner()

        await deployments.delete('EndpointV2')
        const endpointV2Deployment = await deployments.deploy('EndpointV2', {
            from: deployer,
            args: [network.config.eid, deployer],
        })

        await deployments.delete('SendUln302')
        const sendUln302 = await deployments.deploy('SendUln302', {
            from: deployer,
            args: [endpointV2Deployment.address, 0, 0],
        })

        await deployments.delete('ReceiveUln302')
        const receiveUln302 = await deployments.deploy('ReceiveUln302', {
            from: deployer,
            args: [endpointV2Deployment.address],
        })

        await deployments.delete('ReadLib1002')
        const readLib1002 = await deployments.deploy('ReadLib1002', {
            from: deployer,
            args: [endpointV2Deployment.address, 0, 0],
        })

        await deployments.delete('SendUln302_Opt2')
        const SendUln302_Opt2 = await deployments.deploy('SendUln302_Opt2', {
            contract: 'SendUln302',
            from: deployer,
            args: [endpointV2Deployment.address, 0, 0],
        })

        await deployments.delete('ReceiveUln302_Opt2')
        const ReceiveUln302_Opt2 = await deployments.deploy('ReceiveUln302_Opt2', {
            contract: 'ReceiveUln302',
            from: deployer,
            args: [endpointV2Deployment.address],
        })

        await deployments.delete('ReadLib1002_Opt2')
        const readLib1002_Opt2 = await deployments.deploy('ReadLib1002_Opt2', {
            contract: 'ReadLib1002',
            from: deployer,
            args: [endpointV2Deployment.address, 0, 1],
        })

        await Promise.all(
            ['DefaultProxyAdmin', 'PriceFeed_Proxy', 'PriceFeed', 'PriceFeed_Implementation'].map((contractName) =>
                deployments.delete(contractName)
            )
        )
        const priceFeed = await deployments.deploy('PriceFeed', {
            from: deployer,
            proxy: {
                owner: deployer,
                proxyContract: 'OptimizedTransparentProxy',
                execute: {
                    init: {
                        methodName: 'initialize',
                        args: [deployer],
                    },
                },
            },
        })

        await deployments.delete('ExecutorFeeLib')
        const executorFeeLib = await deployments.deploy('ExecutorFeeLib', {
            from: deployer,
            args: [network.config.eid, DEFAULT_NATIVE_DECIMALS_RATE],
        })

        await Promise.all(
            ['Executor_Proxy', 'Executor_Implementation', 'Executor', 'ExecutorProxyAdmin'].map((contractName) =>
                deployments.delete(contractName)
            )
        )
        const executor = await deployments.deploy('Executor', {
            from: deployer,
            log: true,
            skipIfAlreadyDeployed: true,
            proxy: {
                owner: deployer,
                proxyContract: 'OptimizedTransparentProxy',
                viaAdminContract: { name: 'ExecutorProxyAdmin', artifact: 'ProxyAdmin' },
                execute: {
                    init: {
                        methodName: 'initialize',
                        args: [
                            endpointV2Deployment.address, // _endpoint
                            receiveUln302.address, // _receiveUln301
                            [sendUln302.address], // _messageLibs
                            priceFeed.address, // _priceFeed
                            deployer, // _roleAdmin
                            [deployer], // _admins
                        ],
                    },
                    onUpgrade: {
                        methodName: 'onUpgrade',
                        args: [receiveUln302.address],
                    },
                },
            },
        })

        const executorContract = new Contract(executor.address, executor.abi).connect(signer)
        const setExecFeeLibResp: TransactionResponse = await executorContract.setWorkerFeeLib(executorFeeLib.address)
        const setExecFeeLibReceipt: TransactionReceipt = await setExecFeeLibResp.wait(1)
        assert(setExecFeeLibReceipt?.status === 1)
        const polledExecutorFeeLib = await executorContract.workerFeeLib?.()
        assert(
            polledExecutorFeeLib?.toLowerCase() === executorFeeLib.address.toLowerCase(),
            'Executor worker fee lib not set correctly'
        )

        await deployments.delete('DVN')
        const dvn = await deployments.deploy('DVN', {
            from: deployer,
            args: [
                network.config.eid, // localEidV2
                network.config.eid, // vid
                [sendUln302.address], // messageLibs
                priceFeed.address, // priceFeed
                [deployer], // signers
                1, // quorum
                [deployer], // admins
            ],
        })

        await deployments.delete('DVN_Opt2')
        const dvn_Opt2 = await deployments.deploy('DVN_Opt2', {
            contract: 'DVN',
            from: deployer,
            args: [
                network.config.eid, // localEidV2
                network.config.eid, // vid
                [sendUln302.address], // messageLibs
                priceFeed.address, // priceFeed
                [deployer], // signers
                1, // quorum
                [deployer], // admins
            ],
        })

        await deployments.delete('DVN_Opt3')
        const dvn_Opt3 = await deployments.deploy('DVN_Opt3', {
            contract: 'DVN',
            from: deployer,
            args: [
                network.config.eid, // localEidV2
                network.config.eid, // vid
                [sendUln302.address], // messageLibs
                priceFeed.address, // priceFeed
                [deployer], // signers
                1, // quorum
                [deployer], // admins
            ],
        })

        await deployments.delete('DVNFeeLib')
        const dvnFeeLib = await deployments.deploy('DVNFeeLib', {
            from: deployer,
            args: [network.config.eid, DEFAULT_NATIVE_DECIMALS_RATE],
        })

        const dvnContract = new Contract(dvn.address, dvn.abi).connect(signer)
        const setDvnFeeLibResp: TransactionResponse = await dvnContract.setWorkerFeeLib?.(dvnFeeLib.address)
        const setDvnFeeLibReceipt: TransactionReceipt = await setDvnFeeLibResp.wait()
        assert(setDvnFeeLibReceipt?.status === 1)
        const polledDvnFeeLib = await dvnContract.workerFeeLib?.()
        assert(
            polledDvnFeeLib?.toLowerCase() === dvnFeeLib.address.toLowerCase(),
            'DVN worker fee lib not set correctly'
        )

        const logger = createLogger(process.env.LZ_DEVTOOLS_ENABLE_DEPLOY_LOGGING ? 'info' : 'error')
        logger.info(
            printRecord({
                Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
                EndpointV2: endpointV2Deployment.address,
                SendUln302: sendUln302.address,
                ReceiveUln302: receiveUln302.address,
                ReadLib1002: readLib1002.address,
                SendUln302_Opt2: SendUln302_Opt2.address,
                ReceiveUln302_Opt2: ReceiveUln302_Opt2.address,
                ReadLib1002_Opt2: readLib1002_Opt2.address,
                PriceFeed: priceFeed.address,
                Executor: executor.address,
                ExecutorFeeLib: executorFeeLib.address,
                DVN: dvn.address,
                DVN_Opt2: dvn_Opt2.address,
                DVN_Opt3: dvn_Opt3.address,
                DVNFeeLib: dvnFeeLib.address,
            })
        )
    }
