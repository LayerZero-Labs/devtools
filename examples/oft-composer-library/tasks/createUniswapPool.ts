// tasks/createUniswapV3Pool.ts

import IUniswapV3FactoryABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import INonfungiblePositionManagerABI from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

// Import ABIs for Uniswap V3 Factory and Position Manager

// Define the Hardhat task
task('create-uniswapv3-pool', 'Creates a Uniswap V3 pool for your OFT token and USDC on Arbitrum Sepolia').setAction(
    async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        // Destructure necessary objects from Hardhat Runtime Environment
        const { ethers, deployments } = hre

        // ====== Configuration ======

        // Replace these addresses with actual deployed contract addresses on Arbitrum Sepolia
        const UNISWAP_V3_FACTORY_ADDRESS = '0xYourUniswapV3FactoryAddress' // e.g., '0x1F98431c8aD98523631AE4a59f267346ea31F984'
        const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0xYourPositionManagerAddress' // e.g., '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
        const YOUR_OFT_ADDRESS = '0xYourOFTTokenAddress' // Replace with your OFT token address
        const USDC_ADDRESS = '0xYourUSDCAddress' // Replace with USDC token address on Arbitrum Sepolia

        // Define the fee tier for the pool (e.g., 3000 = 0.3%)
        const FEE_TIER = 3000

        // Define the amount of OFT and USDC to add as initial liquidity
        const AMOUNT_OFT_DESIRED = ethers.utils.parseUnits('1000', 18) // Adjust decimals if your OFT has different decimals
        const AMOUNT_USDC_DESIRED = ethers.utils.parseUnits('1000', 6) // USDC typically has 6 decimals

        // Define slippage parameters (set min amounts equal to desired amounts for zero slippage)
        const AMOUNT_OFT_MIN = AMOUNT_OFT_DESIRED
        const AMOUNT_USDC_MIN = AMOUNT_USDC_DESIRED

        // Define the recipient and deadline for the liquidity provision
        const signer = (await ethers.getSigners())[0]
        const recipient = signer.address
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now

        // ====== Instantiate Contracts ======

        // Instantiate Uniswap V3 Factory
        const factory = new Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryABI.abi, signer)

        // Instantiate Nonfungible Position Manager
        const positionManager = new Contract(
            NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI.abi,
            signer
        )

        // Instantiate your OFT token contract
        const oftContract = new Contract(
            YOUR_OFT_ADDRESS,
            [
                'function approve(address spender, uint256 amount) external returns (bool)',
                'function decimals() view returns (uint8)',
            ],
            signer
        )

        // Instantiate USDC token contract
        const usdcContract = new Contract(
            USDC_ADDRESS,
            [
                'function approve(address spender, uint256 amount) external returns (bool)',
                'function decimals() view returns (uint8)',
            ],
            signer
        )

        // ====== Approve Position Manager to Spend Tokens ======

        console.log('Approving Position Manager to spend OFT tokens...')
        const approveOftTx = await oftContract.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, AMOUNT_OFT_DESIRED)
        await approveOftTx.wait()
        console.log('OFT token approval completed.')

        console.log('Approving Position Manager to spend USDC tokens...')
        const approveUsdcTx = await usdcContract.approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, AMOUNT_USDC_DESIRED)
        await approveUsdcTx.wait()
        console.log('USDC token approval completed.')

        // ====== Check if Pool Exists ======

        console.log('Checking if the pool already exists...')
        const poolAddress = await factory.getPool(YOUR_OFT_ADDRESS, USDC_ADDRESS, FEE_TIER)
        if (poolAddress !== ethers.constants.AddressZero) {
            console.log(`Pool already exists at address: ${poolAddress}`)
            return
        }
        console.log('Pool does not exist. It will be created upon adding liquidity.')

        // ====== Define Tick Ranges ======

        // For demonstration purposes, use wide tick ranges to cover all possible prices
        const tickSpacing = await factory.tickSpacing(FEE_TIER) // Get tick spacing for the fee tier
        const tickLower = -887220 // Minimum tick
        const tickUpper = 887220 // Maximum tick

        // ====== Add Liquidity (Create Pool) ======

        console.log('Adding liquidity to create the pool...')
        const mintTx = await positionManager.mint({
            token0: YOUR_OFT_ADDRESS,
            token1: USDC_ADDRESS,
            fee: FEE_TIER,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: AMOUNT_OFT_DESIRED,
            amount1Desired: AMOUNT_USDC_DESIRED,
            amount0Min: AMOUNT_OFT_MIN,
            amount1Min: AMOUNT_USDC_MIN,
            recipient: recipient,
            deadline: deadline,
        })

        const receipt = await mintTx.wait()
        console.log(`Liquidity added successfully. Transaction hash: ${receipt.transactionHash}`)

        // ====== Retrieve Pool Address ======

        const newPoolAddress = await factory.getPool(YOUR_OFT_ADDRESS, USDC_ADDRESS, FEE_TIER)
        console.log(`New Pool Address: ${newPoolAddress}`)

        // ====== Confirm Pool Creation ======

        if (newPoolAddress !== ethers.constants.AddressZero) {
            console.log('Pool created successfully!')
        } else {
            console.error('Failed to create the pool.')
        }
    }
)
