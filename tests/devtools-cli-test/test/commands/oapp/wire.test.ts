import 'hardhat'
import { isFile } from '@layerzerolabs/io-devtools'
import { dirname, join, relative } from 'path'
import { cwd } from 'process'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { runCli } from '../../__utils__/cli'

describe(`command oapp wire`, () => {
    const runWire = (args: string[] = []) => runCli(['oapp', 'wire', ...args])

    const CONFIGS_BASE_DIR = relative(cwd(), join(__dirname, '__data__', 'configs'))
    const SETUPS_BASE_DIR = relative(cwd(), join(__dirname, '__data__', 'setups'))

    const configPathFixture = (fileName: string): string => {
        const path = join(CONFIGS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    const setupPathFixture = (fileName: string): string => {
        const path = join(SETUPS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    describe('with missing options', () => {
        it('should fail if the setup file is not passed', async () => {
            const result = runWire(['--oapp-config', './does-not-exist.js'])

            expect(result.stderr).toMatch("required option '-s,--setup <path>' not specified")
            expect(result.status).toBe(1)
        })

        it('should fail if the config file is not passed', async () => {
            const result = runWire(['--setup', './does-not-exist.js'])

            expect(result.stderr).toMatch("required option '--oapp-config <path>' not specified")
            expect(result.status).toBe(1)
        })
    })

    describe('with invalid options', () => {
        beforeAll(async () => {
            await deployContract('OApp')
        })

        describe('with invalid config option', () => {
            it('should fail if the config file does not exist', async () => {
                const result = runWire([
                    '--oapp-config',
                    './does-not-exist.js',
                    '--setup',
                    setupPathFixture('valid.setup.ts'),
                ])

                expect(result.stdout).toMatch(`Unable to read config file './does-not-exist.js'`)
                expect(result.status).not.toBe(0)
            })

            it('should fail if the config file is not a file', async () => {
                const oappConfig = dirname(configPathFixture('invalid.config.empty.json'))

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatch(`Unable to read config file '${oappConfig}`)
                expect(result.status).not.toBe(0)
            })

            it('should fail if the config file is not a valid JSON or JS file', async () => {
                const oappConfig = 'README.md'

                expect(isFile(oappConfig)).toBeTruthy()

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatch(`Unable to read config file '${oappConfig}`)
                expect(result.status).not.toBe(0)
            })

            it('should fail with an empty JSON file', async () => {
                const oappConfig = configPathFixture('invalid.config.empty.json')

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatch(`Unable to read config file '${oappConfig}'`)
                expect(result.stdout).toMatch(`Unexpected end of JSON input`)
                expect(result.status).not.toBe(0)
            })

            it('should fail with an empty JS file', async () => {
                const oappConfig = configPathFixture('invalid.config.empty.js')

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatchSnapshot()
                expect(result.status).not.toBe(0)
            })

            it('should fail with a malformed JS file (001)', async () => {
                const oappConfig = configPathFixture('invalid.config.001.js')

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatchSnapshot()
                expect(result.status).not.toBe(0)
            })

            it('should fail with a misconfigured file (001)', async () => {
                const oappConfig = configPathFixture('valid.config.misconfigured.001.js')

                const result = runWire(['--oapp-config', oappConfig, '--setup', setupPathFixture('valid.setup.ts')])
                expect(result.stdout).toMatchSnapshot()
                expect(result.status).not.toBe(0)
            })
        })

        describe('with invalid setup option', () => {
            it('should fail if the setup file does not exist', async () => {
                const result = runWire([
                    '--oapp-config',
                    configPathFixture('valid.config.empty.js'),
                    '--setup',
                    './does-not-exist.js',
                ])

                expect(result.stdout).toMatch(`Unable to read setup file './does-not-exist.js'`)
                expect(result.status).not.toBe(0)
            })

            it('should fail if the config file is not a file', async () => {
                const setup = dirname(configPathFixture('invalid.config.empty.json'))

                const result = runWire(['--oapp-config', configPathFixture('valid.config.empty.js'), '--setup', setup])
                expect(result.stdout).toMatch(`Unable to read setup file '${setup}`)
                expect(result.status).not.toBe(0)
            })

            it('should fail if the config file is not a valid JSON or JS file', async () => {
                const setup = 'README.md'

                expect(isFile(setup)).toBeTruthy()

                const result = runWire(['--oapp-config', configPathFixture('valid.config.empty.js'), '--setup', setup])
                expect(result.stdout).toMatch(`Unable to read setup file '${setup}`)
                expect(result.status).not.toBe(0)
            })

            it('should fail with an empty JS file', async () => {
                const setup = setupPathFixture('invalid.setup.empty.js')

                const result = runWire(['--oapp-config', configPathFixture('valid.config.empty.js'), '--setup', setup])
                expect(result.stdout).toMatchSnapshot()
                expect(result.status).not.toBe(0)
            })

            it('should fail with a malformed JS file (001)', async () => {
                const setup = setupPathFixture('invalid.setup.001.js')

                const result = runWire(['--oapp-config', configPathFixture('valid.config.empty.js'), '--setup', setup])
                expect(result.stdout).toMatchSnapshot()
                expect(result.status).not.toBe(0)
            })
        })
    })

    describe('with valid configs', () => {
        beforeEach(async () => {
            await deployContract('OApp')
        })

        it('should exit with an empty config', async () => {
            const oappConfig = configPathFixture('valid.config.empty.ts')
            const setup = setupPathFixture('valid.setup.ts')

            const result = runWire(['--oapp-config', oappConfig, '--setup', setup])
            expect(result.stdout).toMatch(`The OApp is wired, no action is necessary`)
            expect(result.status).toBe(0)
        })

        it('should not understand hardhat config', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')
            const setup = setupPathFixture('valid.setup.ts')

            const result = runWire(['--oapp-config', oappConfig, '--setup', setup])
            expect(result.stderr).toMatchSnapshot()
            expect(result.status).not.toBe(0)
        })
    })
})
