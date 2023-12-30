import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { formatEid } from '@layerzerolabs/devtools'
import { wrapEIP1193Provider } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import assert from 'assert'
import { BigNumber, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { type DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const DEFAULT_NATIVE_DECIMALS_RATE = '18' //ethers.utils.parseUnits('1', 18).toString()

/**
 * This `deploy` function will deploy and configure LayerZero EndpointV2.  This includes:
 * - EndpointV2
 * - SendUln302
 * - ReceiveUln302
 * - PriceFeed
 * - Executor
 * - ExecutorFeeLib
 * - DVN
 * - DVNFeeLib
 *
 * @param {HardhatRuntimeEnvironment} env
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }: HardhatRuntimeEnvironment) => {
    assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')
    const signer = wrapEIP1193Provider(network.provider).getSigner()
    const dstEid = BigNumber.from(
        network.config.eid === EndpointId.ETHEREUM_V2_MAINNET
            ? EndpointId.AVALANCHE_V2_MAINNET
            : EndpointId.ETHEREUM_V2_MAINNET
    )

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
    const priceFeedContract = new Contract(priceFeed.address, priceFeed.abi).connect(signer)
    const setPriceResp: TransactionResponse = await priceFeedContract.setPrice([
        {
            eid: dstEid,
            price: {
                priceRatio: '100000000000000000000',
                gasPriceInUnit: 1,
                gasPerByte: 1,
            },
        },
    ])
    const setPriceReceipt = await setPriceResp.wait()
    assert(setPriceReceipt?.status === 1)

    await deployments.delete('ExecutorFeeLib')
    const executorFeeLib = await deployments.deploy('ExecutorFeeLib', {
        from: deployer,
        args: [DEFAULT_NATIVE_DECIMALS_RATE],
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

    const nativeCap = parseEther('0.25')
    const baseGas = BigNumber.from(200000)
    const setDstConfigResp: TransactionResponse = await executorContract.setDstConfig([
        {
            dstEid,
            baseGas,
            multiplierBps: BigNumber.from(0),
            floorMarginUSD: BigNumber.from(0),
            nativeCap,
        },
    ])
    const setDstConfigReceipt: TransactionReceipt = await setDstConfigResp.wait()
    assert(setDstConfigReceipt?.status === 1)
    const polledDstConfig = await executorContract.dstConfig(dstEid)
    assert(BigNumber.from(polledDstConfig[0]).eq(baseGas), 'Executor dst config baseGas not set correctly')
    assert(BigNumber.from(polledDstConfig[3]).eq(nativeCap), 'Executor dst config nativeCap not set correctly')

    await deployments.delete('DVN')
    const dvn = await deployments.deploy('DVN', {
        from: deployer,
        args: [
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
        args: [DEFAULT_NATIVE_DECIMALS_RATE],
    })

    const dvnContract = new Contract(dvn.address, dvn.abi).connect(signer)
    const setDvnFeeLibResp: TransactionResponse = await dvnContract.setWorkerFeeLib?.(dvnFeeLib.address)
    const setDvnFeeLibReceipt: TransactionReceipt = await setDvnFeeLibResp.wait()
    assert(setDvnFeeLibReceipt?.status === 1)
    const polledDvnFeeLib = await dvnContract.workerFeeLib?.()
    assert(polledDvnFeeLib?.toLowerCase() === dvnFeeLib.address.toLowerCase(), 'DVN worker fee lib not set correctly')

    console.table({
        Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
        EndpointV2: endpointV2Deployment.address,
        SendUln302: sendUln302.address,
        ReceiveUln302: receiveUln302.address,
        SendUln302_Opt2: SendUln302_Opt2.address,
        ReceiveUln302_Opt2: ReceiveUln302_Opt2.address,
        PriceFeed: priceFeed.address,
        Executor: executor.address,
        ExecutorFeeLib: executorFeeLib.address,
        DVN: dvn.address,
        DVNFeeLib: dvnFeeLib.address,
    })
}

deploy.tags = ['Bootstrap', 'EndpointV2']

export default deploy
