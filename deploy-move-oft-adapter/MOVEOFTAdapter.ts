// import assert from 'assert'

// import { type DeployFunction } from 'hardhat-deploy/types'

// const contractName = 'MOVEOFTAdapter'

// const deploy: DeployFunction = async (hre) => {
//     const { getNamedAccounts, deployments } = hre

//     const { deploy } = deployments
//     const { deployer } = await getNamedAccounts()

//     assert(deployer, 'Missing named deployer account')

//     console.log(`Network: ${hre.network.name}`)
//     console.log(`Deployer: ${deployer}`)

//     const deployData: { [key: number]: { moveAddress: string; endpointAddress: any; rateLimits: any[] } } = {
//         1: {
//             moveAddress: '0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073',
//             endpointAddress: '0x1a44076050125825900e736c501f859c50fE728c',
//             //   eid,    daily limit, window
//             rateLimits: [
//                 [3073, 10000000 * 1e8, 86400],
//                 [1, 0, 1],
//             ],
//         },
//         4: {
//             moveAddress: '0xdfd318a689EF63833C4e9ab6Da17F0d5e3010013',
//             endpointAddress: '0x6EDCE65403992e310A62460808c4b910D972f10f',
//             rateLimits: [], // Add the missing rateLimits property here
//         },
//     }
//     if (!hre.network.config.chainId) return
//     const args = [
//         deployData[hre.network.config.chainId],
//         deployData[hre.network.config.chainId],
//         deployer,
//         deployData[hre.network.config.chainId].rateLimits,
//     ]

//     const { address } = await deploy(contractName, {
//         from: deployer,
//         args,
//         log: true,
//         skipIfAlreadyDeployed: false,
//     })

//     console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
// }

// deploy.tags = [contractName]

// export default deploy
