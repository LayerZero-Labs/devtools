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
    const abiJson = deploymentJson.abi
    const adapterAddress = deploymentJson.address

    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set PRIVATE_KEY environment variable in a .env file')
    }

    const provider = new ethers.providers.JsonRpcProvider(srcRpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const adapterContract = new ethers.Contract(adapterAddress, abiJson, wallet)

    console.log('🔍 Debugging Adapter Configuration...')
    console.log(`📍 Adapter Address: ${adapterAddress}`)

    const tokenAddress = await adapterContract.token()
    console.log(`🪙 Token Address: ${tokenAddress}`)

    const minterBurnerAddress = await adapterContract.minterBurner()
    console.log(`🔥 MinterBurner Address: ${minterBurnerAddress}`)

    const tokenContract = new ethers.Contract(
        tokenAddress,
        [
            'function hasRole(bytes32,address) view returns (bool)',
            'function MINTER_ROLE() view returns (bytes32)',
            'function BURNER_ROLE() view returns (bytes32)',
        ],
        wallet
    )

    try {
        const minterRole = await tokenContract.MINTER_ROLE()
        const burnerRole = await tokenContract.BURNER_ROLE()

        const hasMinterRole = await tokenContract.hasRole(minterRole, minterBurnerAddress)
        const hasBurnerRole = await tokenContract.hasRole(burnerRole, minterBurnerAddress)

        console.log(`🔑 MinterBurner has MINTER_ROLE: ${hasMinterRole}`)
        console.log(`🔑 MinterBurner has BURNER_ROLE: ${hasBurnerRole}`)

        if (!hasMinterRole || !hasBurnerRole) {
            console.log('❌ MinterBurner lacks required permissions!')
            console.log('💡 The MinterBurner contract needs both MINTER_ROLE and BURNER_ROLE on the token contract')
        }
    } catch (error) {
        console.log('⚠️  Could not check roles - token might use different access control')
    }

    const destEndpointId = EndpointId.AVALANCHE_V2_TESTNET
    const peer = await adapterContract.peers(destEndpointId)
    console.log(`🤝 Peer for Avalanche (${destEndpointId}): ${peer}`)

    if (peer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('❌ No peer set for Avalanche testnet!')
    }
}

main().catch((error) => {
    console.error('💥 Error:', error.message || error)
    process.exit(1)
})
