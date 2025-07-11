import { fetchMint } from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

/**
 * Get the shared decimals for a Solana OFT
 * 
 * The shared decimals are not directly stored in the OFTStore account.
 * Instead, they can be calculated from the ld2sd_rate (local decimals to shared decimals rate)
 * and the token mint decimals.
 * 
 * Formula: shared_decimals = token_mint_decimals - log10(ld2sd_rate)
 * 
 * @param umi - UMI instance
 * @param oftStoreAddress - The OFTStore PDA address
 * @returns The shared decimals as a number
 */
export async function getOFTSharedDecimals(umi: any, oftStoreAddress: string): Promise<number> {
    // Fetch the OFTStore account data
    const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, publicKey(oftStoreAddress))
    
    // Fetch the token mint to get its decimals
    const mintInfo = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))
    const tokenMintDecimals = mintInfo.decimals
    
    // Get the ld2sd_rate from the OFTStore
    const ld2sdRate = oftStoreInfo.ld2sdRate
    
    // Calculate shared decimals: shared_decimals = token_mint_decimals - log10(ld2sd_rate)
    // Since ld2sd_rate = 10^(token_mint_decimals - shared_decimals)
    // We can solve for shared_decimals: shared_decimals = token_mint_decimals - log10(ld2sd_rate)
    const sharedDecimals = tokenMintDecimals - Math.log10(Number(ld2sdRate))
    
    return Math.round(sharedDecimals)
}

/**
 * Alternative method to get shared decimals using the OFTStore's conversion methods
 * 
 * This method uses the fact that the OFTStore has methods to convert between
 * local decimals (ld) and shared decimals (sd).
 * 
 * @param umi - UMI instance
 * @param oftStoreAddress - The OFTStore PDA address
 * @returns The shared decimals as a number
 */
export async function getOFTSharedDecimalsAlternative(umi: any, oftStoreAddress: string): Promise<number> {
    // Fetch the OFTStore account data
    const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, publicKey(oftStoreAddress))
    
    // Fetch the token mint to get its decimals
    const mintInfo = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))
    const tokenMintDecimals = mintInfo.decimals
    
    // The ld2sd_rate is the conversion factor from local decimals to shared decimals
    // If we have 1 token in local decimals, how many shared decimal units is that?
    const ld2sdRate = Number(oftStoreInfo.ld2sdRate)
    
    // Test conversion: convert 1 local decimal unit to shared decimals
    // This should give us the conversion rate, and we can work backwards
    const oneLocalUnit = 1n
    const oneLocalUnitInShared = Number(oneLocalUnit) / ld2sdRate
    
    // If 1 local unit = 1/ld2sd_rate shared units, then:
    // shared_decimals = token_mint_decimals - log10(ld2sd_rate)
    const sharedDecimals = tokenMintDecimals - Math.log10(ld2sdRate)
    
    return Math.round(sharedDecimals)
}

// Example usage:
/*
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js'

async function example() {
    const umi = createUmi(web3JsRpc('https://api.mainnet-beta.solana.com'))
    const oftStoreAddress = 'your_oft_store_address_here'
    
    const sharedDecimals = await getOFTSharedDecimals(umi, oftStoreAddress)
    console.log('OFT Shared Decimals:', sharedDecimals)
}
*/