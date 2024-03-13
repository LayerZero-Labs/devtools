import {
    getAnvilOptionsFromHardhatNetworks,
    getHardhatNetworkOverrides,
    resolveSimulationConfig,
} from '@/simulation/config'
import fc from 'fast-check'
import hre from 'hardhat'
import { resolve } from 'path'

describe('simulation/config', () => {
    describe('resolveSimulationConfig()', () => {
        it('should resolve with defaults without no properties', () => {
            expect(resolveSimulationConfig({}, hre.config)).toEqual({
                port: 8545,
                directory: resolve(hre.config.paths.root, '.layerzero'),
                anvil: {
                    mnemonic: 'test test test test test test test test test test test junk',
                },
            })
        })

        it('should not override user values if provided', () => {
            fc.assert(
                fc.property(fc.integer(), fc.string(), fc.string(), (port, directory, mnemonic) => {
                    expect(resolveSimulationConfig({ port, directory, anvil: { mnemonic } }, hre.config)).toEqual({
                        port,
                        directory: resolve(hre.config.paths.root, directory),
                        anvil: {
                            mnemonic,
                        },
                    })
                })
            )
        })
    })

    describe('getAnvilOptionsFromHardhatNetworks()', () => {
        it('should return an empty object if there are no networks', () => {
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(getAnvilOptionsFromHardhatNetworks(simulationConfig, {})).toStrictEqual({})
        })

        it('should return an empty object if there are no http networks', () => {
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(
                getAnvilOptionsFromHardhatNetworks(simulationConfig, {
                    hardhat: hre.config.networks.hardhat,
                })
            ).toStrictEqual({})
        })

        it('should return an object with networks mapped to anvil options if there are http networks', () => {
            const localhost = hre.config.networks.localhost
            const networkA = { ...localhost, url: 'http://network.a' }
            const networkB = { ...localhost, url: 'http://network.b' }
            const networkC = { ...localhost, url: 'http://network.c' }
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(
                getAnvilOptionsFromHardhatNetworks(simulationConfig, {
                    networkA,
                    networkB,
                    networkC,
                })
            ).toStrictEqual({
                networkA: {
                    forkUrl: networkA.url,
                    mnemonic: simulationConfig.anvil.mnemonic,
                },
                networkB: {
                    forkUrl: networkB.url,
                    mnemonic: simulationConfig.anvil.mnemonic,
                },
                networkC: {
                    forkUrl: networkC.url,
                    mnemonic: simulationConfig.anvil.mnemonic,
                },
            })
        })
    })

    describe('getHardhatNetworkOverrides()', () => {
        it('should return an empty object if there are no networks', () => {
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(getHardhatNetworkOverrides(simulationConfig, {})).toStrictEqual({})
        })

        it('should return an empty object if there are no http networks', () => {
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(
                getHardhatNetworkOverrides(simulationConfig, {
                    hardhat: hre.config.networks.hardhat,
                })
            ).toStrictEqual({})
        })

        it('should return an object with networks mapped to anvil options if there are http networks', () => {
            const localhost = hre.config.networks.localhost
            const networkA = { ...localhost, url: 'http://network.a' }
            const networkB = { ...localhost, url: 'http://network.b' }
            const networkC = { ...localhost, url: 'http://network.c' }
            const simulationConfig = resolveSimulationConfig({}, hre.config)

            expect(
                getHardhatNetworkOverrides(simulationConfig, {
                    networkA,
                    networkB,
                    networkC,
                })
            ).toStrictEqual({
                networkA: {
                    url: `http://localhost:${simulationConfig.port}/networkA`,
                    accounts: {
                        mnemonic: simulationConfig.anvil.mnemonic,
                    },
                },
                networkB: {
                    url: `http://localhost:${simulationConfig.port}/networkB`,
                    accounts: {
                        mnemonic: simulationConfig.anvil.mnemonic,
                    },
                },
                networkC: {
                    url: `http://localhost:${simulationConfig.port}/networkC`,
                    accounts: {
                        mnemonic: simulationConfig.anvil.mnemonic,
                    },
                },
            })
        })
    })
})
