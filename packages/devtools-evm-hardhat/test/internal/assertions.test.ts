import 'hardhat'
import { assertDefinedNetworks } from '@/internal'
import fc from 'fast-check'

describe('internal/assertions', () => {
    describe('assertDefinedNetworks', () => {
        const definedNetworks = ['ethereum-mainnet', 'ethereum-testnet', 'bsc-testnet']
        const definedNetworkArbitrary = fc.constantFrom(...definedNetworks)

        const definedNetworksArrayArbitrary = fc.array(definedNetworkArbitrary)
        const definedNetworksSetArbitrary = definedNetworksArrayArbitrary.map((networks) => new Set(networks))

        it('should not throw if called with an array of networks defined in hardhat config', () => {
            fc.assert(
                fc.property(definedNetworksArrayArbitrary, (networks) => {
                    expect(assertDefinedNetworks(networks)).toBe(networks)
                })
            )
        })

        it('should not throw if called with a Set of networks defined in hardhat config', () => {
            fc.assert(
                fc.property(definedNetworksSetArbitrary, (networks) => {
                    expect(assertDefinedNetworks(networks)).toBe(networks)
                })
            )
        })

        it('should throw if called if a network has not been defined in an array', () => {
            fc.assert(
                fc.property(definedNetworksArrayArbitrary, fc.string(), (networks, network) => {
                    fc.pre(!definedNetworks.includes(network))

                    expect(() => assertDefinedNetworks([...networks, network])).toThrow()
                })
            )
        })

        it('should throw if called if a network has not been defined in a Set', () => {
            fc.assert(
                fc.property(definedNetworksSetArbitrary, fc.string(), (networks, network) => {
                    fc.pre(!definedNetworks.includes(network))

                    expect(() => assertDefinedNetworks(networks.add(network))).toThrow()
                })
            )
        })
    })
})
