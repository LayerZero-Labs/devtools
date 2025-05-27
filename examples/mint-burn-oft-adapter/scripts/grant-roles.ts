import { ethers } from 'ethers'
import 'dotenv/config'

async function main() {
    const bombTokenAddress = '0xC3D4E9Ac47D7f37bB07C2f8355Bb4940DEA3bbC3'
    const oftAdapterAddress = '0xD115C0E156fe1ceA7645dE017dd215CEc5d86cb7'
    const rpcUrl = 'https://gateway.tenderly.co/public/sepolia'

    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set PRIVATE_KEY environment variable in a .env file')
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const bombTokenContract = new ethers.Contract(
        bombTokenAddress,
        [
            'function grantRole(bytes32 role, address account)',
            'function hasRole(bytes32 role, address account) view returns (bool)',
            'function MINTER_ROLE() view returns (bytes32)',
            'function BURNER_ROLE() view returns (bytes32)',
        ],
        wallet
    )

    console.log('🔑 Granting roles to OFT Adapter...')
    console.log(`📍 BombToken: ${bombTokenAddress}`)
    console.log(`📍 OFT Adapter: ${oftAdapterAddress}`)

    const minterRole = await bombTokenContract.MINTER_ROLE()
    const burnerRole = await bombTokenContract.BURNER_ROLE()

    console.log(`🔍 MINTER_ROLE: ${minterRole}`)
    console.log(`🔍 BURNER_ROLE: ${burnerRole}`)

    const hasMinterRole = await bombTokenContract.hasRole(minterRole, oftAdapterAddress)
    const hasBurnerRole = await bombTokenContract.hasRole(burnerRole, oftAdapterAddress)

    console.log(`✅ OFT Adapter has MINTER_ROLE: ${hasMinterRole}`)
    console.log(`✅ OFT Adapter has BURNER_ROLE: ${hasBurnerRole}`)

    if (!hasMinterRole) {
        console.log('🚀 Granting MINTER_ROLE...')
        const minterTx = await bombTokenContract.grantRole(minterRole, oftAdapterAddress)
        console.log(`📝 MINTER_ROLE grant transaction: ${minterTx.hash}`)
        await minterTx.wait()
        console.log('✅ MINTER_ROLE granted successfully')
    } else {
        console.log('ℹ️  MINTER_ROLE already granted')
    }

    if (!hasBurnerRole) {
        console.log('🚀 Granting BURNER_ROLE...')
        const burnerTx = await bombTokenContract.grantRole(burnerRole, oftAdapterAddress)
        console.log(`📝 BURNER_ROLE grant transaction: ${burnerTx.hash}`)
        await burnerTx.wait()
        console.log('✅ BURNER_ROLE granted successfully')
    } else {
        console.log('ℹ️  BURNER_ROLE already granted')
    }

    console.log('🎉 All roles granted successfully!')
}

main().catch((error) => {
    console.error('💥 Error:', error.message || error)
    process.exit(1)
})
