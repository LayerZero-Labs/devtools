import {
    getAnvilOptionsFromHardhatNetworks,
    getHardhatNetworkOverrides,
    resolveSimulationConfig,
} from '@/simulation/config'
import { mnemonicArbitrary } from '@layerzerolabs/test-devtools'
import fc from 'fast-check'
import hre from 'hardhat'
import { HttpNetworkConfig } from 'hardhat/types'
import { resolve } from 'path'

describe('simulation/config', () => {
    describe('resolveSimulationConfig()', () => {
        it('should resolve with defaults when called with no properties', () => {
            expect(resolveSimulationConfig({}, hre.config)).toEqual({
                port: 8545,
                directory: resolve(hre.config.paths.root, '.layerzero'),
                overwriteAccounts: true,
                anvil: {
                    host: '0.0.0.0',
                    port: 8545,
                    mnemonic: 'test test test test test test test test test test test junk',
                },
            })
        })

        it('should not override user values if provided', () => {
            fc.assert(
                fc.property(
                    fc.integer(),
                    fc.string(),
                    mnemonicArbitrary,
                    fc.boolean(),
                    (port, directory, mnemonic, overwriteAccounts) => {
                        expect(
                            resolveSimulationConfig(
                                { port, directory, overwriteAccounts, anvil: { mnemonic } },
                                hre.config
                            )
                        ).toEqual({
                            port,
                            directory: resolve(hre.config.paths.root, directory),
                            overwriteAccounts,
                            anvil: {
                                host: '0.0.0.0',
                                port: 8545,
                                mnemonic,
                            },
                        })
                    }
                )
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
                    host: '0.0.0.0',
                    port: 8545,
                },
                networkB: {
                    forkUrl: networkB.url,
                    mnemonic: simulationConfig.anvil.mnemonic,
                    host: '0.0.0.0',
                    port: 8545,
                },
                networkC: {
                    forkUrl: networkC.url,
                    mnemonic: simulationConfig.anvil.mnemonic,
                    host: '0.0.0.0',
                    port: 8545,
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

        describe('if overrideAccounts is set to false', () => {
            it('should return an object with networks mapped to anvil options if there are http networks', () => {
                const localhost = hre.config.networks.localhost
                const networkA: HttpNetworkConfig = { ...localhost, url: 'http://network.a', accounts: [] }
                const networkB: HttpNetworkConfig = {
                    ...localhost,
                    url: 'http://network.b',
                    accounts: {
                        count: 10,
                        initialIndex: 0,
                        passphrase: '',
                        path: "m/44'/60'/0'/0/",
                        mnemonic: 'tomato potato',
                    },
                }
                const networkC: HttpNetworkConfig = { ...localhost, url: 'http://network.c', accounts: 'remote' }
                const simulationConfig = resolveSimulationConfig({ overwriteAccounts: false }, hre.config)

                expect(
                    getHardhatNetworkOverrides(simulationConfig, {
                        networkA,
                        networkB,
                        networkC,
                    })
                ).toStrictEqual({
                    networkA: {
                        ...networkA,
                        url: `http://localhost:${simulationConfig.port}/networkA`,
                    },
                    networkB: {
                        ...networkB,
                        url: `http://localhost:${simulationConfig.port}/networkB`,
                    },
                    networkC: {
                        ...networkC,
                        url: `http://localhost:${simulationConfig.port}/networkC`,
                    },
                })
            })
        })

        describe('if overrideAccounts is set to true', () => {
            it('should return an object with networks mapped to anvil options if there are http networks', () => {
                const localhost = hre.config.networks.localhost
                const networkA = { ...localhost, url: 'http://network.a' }
                const networkB = { ...localhost, url: 'http://network.b' }
                const networkC = { ...localhost, url: 'http://network.c' }
                const simulationConfig = resolveSimulationConfig({ overwriteAccounts: true }, hre.config)

                expect(
                    getHardhatNetworkOverrides(simulationConfig, {
                        networkA,
                        networkB,
                        networkC,
                    })
                ).toStrictEqual({
                    networkA: {
                        ...networkA,
                        url: `http://localhost:${simulationConfig.port}/networkA`,
                        accounts: {
                            count: 10,
                            initialIndex: 0,
                            passphrase: '',
                            path: "m/44'/60'/0'/0/",
                            mnemonic: simulationConfig.anvil.mnemonic,
                        },
                    },
                    networkB: {
                        ...networkB,
                        url: `http://localhost:${simulationConfig.port}/networkB`,
                        accounts: {
                            count: 10,
                            initialIndex: 0,
                            passphrase: '',
                            path: "m/44'/60'/0'/0/",
                            mnemonic: simulationConfig.anvil.mnemonic,
                        },
                    },
                    networkC: {
                        ...networkC,
                        url: `http://localhost:${simulationConfig.port}/networkC`,
                        accounts: {
                            count: 10,
                            initialIndex: 0,
                            passphrase: '',
                            path: "m/44'/60'/0'/0/",
                            mnemonic: simulationConfig.anvil.mnemonic,
                        },
                    },
                })
            })

            it('should respect anvil accounts options', () => {
                const localhost = hre.config.networks.localhost
                const networkA = { ...localhost, url: 'http://network.a' }
                const simulationConfig = resolveSimulationConfig(
                    {
                        overwriteAccounts: true,
                        anvil: {
                            count: 20,
                            derivationPath: "m/44'/60'/0'/16/",
                        },
                    },
                    hre.config
                )

                expect(
                    getHardhatNetworkOverrides(simulationConfig, {
                        networkA,
                    })
                ).toStrictEqual({
                    networkA: {
                        ...networkA,
                        url: `http://localhost:${simulationConfig.port}/networkA`,
                        accounts: {
                            count: simulationConfig.anvil.count,
                            initialIndex: 0,
                            passphrase: '',
                            path: simulationConfig.anvil.derivationPath,
                            mnemonic: simulationConfig.anvil.mnemonic,
                        },
                    },
                })
            })
        })
    })
})
