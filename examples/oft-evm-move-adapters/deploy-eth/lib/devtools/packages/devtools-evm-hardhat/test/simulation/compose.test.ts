import hre from 'hardhat'
import { resolveSimulationConfig } from '@/simulation'
import {
    createEvmNodeProxyServiceSpec,
    createEvmNodeServiceSpec,
    createSimulationComposeSpec,
} from '@/simulation/compose'
import { serializeDockerComposeSpec } from '@layerzerolabs/devtools'
import { AnvilOptions } from '@layerzerolabs/devtools-evm'
import { mnemonicArbitrary, optionalArbitrary } from '@layerzerolabs/test-devtools'
import { spawnSync } from 'child_process'
import fc from 'fast-check'
import { rm, writeFile } from 'fs/promises'
import { join } from 'path'

describe('simulation/compose', () => {
    // The available docker port range
    const portArbitrary = fc.integer({ min: 1, max: 65535 })

    const anvilOptionsArbitrary: fc.Arbitrary<AnvilOptions> = fc.record({
        host: optionalArbitrary(fc.ipV4()),
        port: optionalArbitrary(portArbitrary),
        count: optionalArbitrary(fc.integer()),
        mnemonic: optionalArbitrary(mnemonicArbitrary),
        blockTime: optionalArbitrary(fc.integer()),
        forkUrl: optionalArbitrary(fc.webUrl()),
    })

    // We are aware of shortcomings of the simulation spec generation process:
    //
    // - whitespace service names will generate invalid compose files. This should not be a problem in a real hardhat project
    // - network named rpc will collide with the RPC proxy container defined in the spec
    //
    // Because of this we'll filter down on the possibilities when it comes to service names
    const serviceNameArbitrary = fc.constantFrom('amoy', 'sepolia-testnet', 'someNetwork', 'someNetwork.V2')

    const SPEC_FILE_PATH = join(__dirname, 'docker-compose.yaml')

    // We add --log-level to suppress any warnings - for example warnings about environment variables not being defined
    //
    // This allows us to easily test the stderr for being empty (otherwise we would need to test it for not containing errors)
    const validateSpec = () => spawnSync('docker', ['--log-level', 'ERROR', 'compose', '-f', SPEC_FILE_PATH, 'config'])

    afterEach(async () => {
        await rm(SPEC_FILE_PATH, { force: true })
    })

    describe('createEvmNodeServiceSpec()', () => {
        it('should work when there are no anvil options', async () => {
            const spec = serializeDockerComposeSpec({
                version: '3.9',
                services: {
                    anvil: createEvmNodeServiceSpec({}),
                },
            })

            await writeFile(SPEC_FILE_PATH, spec)

            const result = validateSpec()

            expect(result.stderr.toString('utf8')).toBe('')
            expect(result.status).toBe(0)
            expect(spec).toMatchSnapshot()
        })

        it('should work with anvil options', async () => {
            await fc.assert(
                fc.asyncProperty(anvilOptionsArbitrary, async (anvilOptions) => {
                    const spec = serializeDockerComposeSpec({
                        version: '3.9',
                        services: {
                            anvil: createEvmNodeServiceSpec(anvilOptions),
                        },
                    })

                    await writeFile(SPEC_FILE_PATH, spec)

                    const result = validateSpec()

                    expect(result.stderr.toString('utf8')).toBe('')
                    expect(result.status).toBe(0)
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('createEvmNodeProxyServiceSpec()', () => {
        const servicesArbitrary = fc.dictionary(
            serviceNameArbitrary,
            anvilOptionsArbitrary.map(createEvmNodeServiceSpec)
        )

        it('should work with anvil services', async () => {
            await fc.assert(
                fc.asyncProperty(portArbitrary, servicesArbitrary, async (port, services) => {
                    const spec = serializeDockerComposeSpec({
                        version: '3.9',
                        services: {
                            ...services,
                            rpc: createEvmNodeProxyServiceSpec(port, services),
                        },
                    })

                    await writeFile(SPEC_FILE_PATH, spec)

                    const result = validateSpec()

                    expect(result.stderr.toString('utf8')).toBe('')
                    expect(result.status).toBe(0)
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('createSimulationComposeSpec()', () => {
        const anvilOptionsRecordArbitrary = fc.dictionary(serviceNameArbitrary, anvilOptionsArbitrary)

        it('should work goddammit', async () => {
            await fc.assert(
                fc.asyncProperty(portArbitrary, anvilOptionsRecordArbitrary, async (port, anvilOptions) => {
                    const simulationConfig = resolveSimulationConfig({ port }, hre.config)
                    const spec = serializeDockerComposeSpec(createSimulationComposeSpec(simulationConfig, anvilOptions))

                    await writeFile(SPEC_FILE_PATH, spec)

                    const result = validateSpec()

                    expect(result.stderr.toString('utf8')).toBe('')
                    expect(result.status).toBe(0)
                }),
                { numRuns: 20 }
            )
        })
    })
})
