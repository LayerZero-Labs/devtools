import { InitiaProvider } from '@layerzerolabs/lz-corekit-initia'

export const getInitiaBlockNumber = async () => {
    const url = 'https://api-initia-testnet.whispernode.com/'
    const provider = InitiaProvider.from(url)

    try {
        // Get current block number
        const blockNumber = await provider.getBlockNumber()
        console.log('Current block number:', blockNumber)

        // Optional: Get block details
        const block = await provider.getBlock(blockNumber)
        console.log('Block details:', block)
    } catch (error) {
        console.error('Error:', error)
    }
}
