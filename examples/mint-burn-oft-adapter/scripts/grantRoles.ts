import * as fs from 'fs'
import * as path from 'path'

import { ethers } from 'ethers'

import 'dotenv/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'

async function getAbiPath(endpointId: EndpointId): Promise<string> {
    const hardhatConfigPath = path.join(__dirname, '..', 'hardhat.config.ts')
    const hardhatConfigContent = fs.readFileSync(hardhatConfigPath, 'utf8')

    const layerzeroConfigPath = path.join(__dirname, '..', 'layerzero.config.ts')
    const layerzeroConfigContent = fs.readFileSync(layerzeroConfigPath, 'utf8')

    const networkNameMatch = hardhatConfigContent.match(
        new RegExp(`'([^']+)':\\s*{[^}]*eid:\\s*EndpointId\\.\\w+\\s*,.*?}`, 'gs')
    )

    let networkName: string | undefined
    if (networkNameMatch) {
        for (const match of networkNameMatch) {
            if (match.includes(`EndpointId.${EndpointId[endpointId]}`)) {
                const nameMatch = match.match(/'([^']+)':\s*{/)
                if (nameMatch) {
                    networkName = nameMatch[1]
                    break
                }
            }
        }
    }

    if (!networkName) {
        throw new Error(`No network found for endpoint ID: ${endpointId}`)
    }

    const contractNameMatch = layerzeroConfigContent.match(
        new RegExp(`eid:\\s*EndpointId\\.${EndpointId[endpointId]}[^}]*contractName:\\s*'([^']+)'`, 'g')
    )

    let contractName: string | undefined
    if (contractNameMatch && contractNameMatch[0]) {
        const nameMatch = contractNameMatch[0].match(/contractName:\s*'([^']+)'/)
        if (nameMatch) {
            contractName = nameMatch[1]
        }
    }

    if (!contractName) {
        throw new Error(`No contract found for endpoint ID: ${endpointId}`)
    }

    return path.join(__dirname, '..', 'deployments', networkName, `${contractName}.json`)
}

async function main() {
    const srcRpcUrl = 'https://gateway.tenderly.co/public/sepolia'
    const srcEndpointId = EndpointId.SEPOLIA_V2_TESTNET

    const abiPath = await getAbiPath(srcEndpointId)
    const deploymentJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
    const adapterAddress = deploymentJson.address

    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set PRIVATE_KEY environment variable in a .env file')
    }

    const provider = new ethers.providers.JsonRpcProvider(srcRpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const adapterContract = new ethers.Contract(adapterAddress, deploymentJson.abi, wallet)

    const tokenAddress = await adapterContract.token()
    const minterBurnerAddress = await adapterContract.minterBurner()

    console.log('🔧 Granting roles to MinterBurner...')
    console.log(`🪙 Token Address: ${tokenAddress}`)
    console.log(`🔥 MinterBurner Address: ${minterBurnerAddress}`)

    const tokenAbiPath = path.join(__dirname, '..', 'deployments', 'sepolia-testnet', 'BOMBToken.json')
    const tokenDeployment = JSON.parse(fs.readFileSync(tokenAbiPath, 'utf8'))
    const tokenContract = new ethers.Contract(tokenAddress, tokenDeployment.abi, wallet)

    const minterRole = await tokenContract.MINTER_ROLE()
    const burnerRole = await tokenContract.BURNER_ROLE()

    console.log(`🔑 MINTER_ROLE: ${minterRole}`)
    console.log(`🔑 BURNER_ROLE: ${burnerRole}`)

    const hasMinterRole = await tokenContract.hasRole(minterRole, minterBurnerAddress)
    const hasBurnerRole = await tokenContract.hasRole(burnerRole, minterBurnerAddress)

    if (!hasMinterRole) {
        console.log('⚡ Granting MINTER_ROLE...')
        const tx1 = await tokenContract.grantRole(minterRole, minterBurnerAddress)
        console.log(`📝 Transaction: ${tx1.hash}`)
        await tx1.wait()
        console.log('✅ MINTER_ROLE granted')
    } else {
        console.log('✅ MINTER_ROLE already granted')
    }

    if (!hasBurnerRole) {
        console.log('⚡ Granting BURNER_ROLE...')
        const tx2 = await tokenContract.grantRole(burnerRole, minterBurnerAddress)
        console.log(`📝 Transaction: ${tx2.hash}`)
        await tx2.wait()
        console.log('✅ BURNER_ROLE granted')
    } else {
        console.log('✅ BURNER_ROLE already granted')
    }

    console.log('🎉 All roles granted successfully!')
}

main().catch((error) => {
    console.error('💥 Error:', error.message || error)
    process.exit(1)
})
