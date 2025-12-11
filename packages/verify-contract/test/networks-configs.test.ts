import { getDefaultScanApiUrl, getDefaultChainId } from '../src/common/url'

describe('TypeScript-based network configuration', () => {
    describe('getDefaultScanApiUrl', () => {
        it('should return Etherscan V2 URL for Ethereum mainnet', () => {
            expect(getDefaultScanApiUrl('ethereum')).toBe('https://api.etherscan.io/v2/api')
        })

        it('should work with network aliases', () => {
            expect(getDefaultScanApiUrl('ethereum-mainnet')).toBe('https://api.etherscan.io/v2/api')
        })

        it('should return custom URL for non-Etherscan networks', () => {
            expect(getDefaultScanApiUrl('aurora')).toBe('https://explorer.mainnet.aurora.dev/api')
        })

        it('should handle testnet networks', () => {
            expect(getDefaultScanApiUrl('sepolia-testnet')).toBe('https://api.etherscan.io/v2/api')
        })

        it('should return undefined for unknown networks', () => {
            expect(getDefaultScanApiUrl('unknown-network')).toBeUndefined()
        })
    })

    describe('getDefaultChainId', () => {
        it('should return correct chain ID for Ethereum', () => {
            expect(getDefaultChainId('ethereum')).toBe(1)
        })

        it('should return correct chain ID for Polygon', () => {
            expect(getDefaultChainId('polygon')).toBe(137)
        })

        it('should work with aliases', () => {
            expect(getDefaultChainId('arbitrum-mainnet')).toBe(42161)
            expect(getDefaultChainId('arbitrum')).toBe(42161)
        })

        it('should return correct chain ID for testnet', () => {
            expect(getDefaultChainId('sepolia-testnet')).toBe(11155111)
        })

        it('should return undefined for unknown networks', () => {
            expect(getDefaultChainId('unknown-network')).toBeUndefined()
        })
    })

    describe('multiple alias support', () => {
        it('should handle -mainnet suffix aliases', () => {
            const networks = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base']

            networks.forEach((network) => {
                const baseUrl = getDefaultScanApiUrl(network)
                const baseChainId = getDefaultChainId(network)
                const aliasUrl = getDefaultScanApiUrl(`${network}-mainnet`)
                const aliasChainId = getDefaultChainId(`${network}-mainnet`)

                expect(baseUrl).toBe(aliasUrl)
                expect(baseChainId).toBe(aliasChainId)
            })
        })

        it('should handle linea/zkconsensys aliases', () => {
            const lineaChainId = getDefaultChainId('linea')
            expect(getDefaultChainId('zkconsensys')).toBe(lineaChainId)
            expect(getDefaultChainId('zkconsensys-mainnet')).toBe(lineaChainId)
        })
    })
})
