import hre from 'hardhat'
import { isFile, promptToContinue } from '@layerzerolabs/io-devtools'
import { dirname, join, relative, resolve } from 'path'
import { TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { cwd } from 'process'
import { JsonRpcSigner } from '@ethersproject/providers'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import {
    createGnosisSignerFactory,
    createSignerFactory,
    SUBTASK_LZ_SIGN_AND_SEND,
} from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

jest.mock('@layerzerolabs/devtools-evm-hardhat', () => {
    const original = jest.requireActual('@layerzerolabs/devtools-evm-hardhat')

    return {
        ...original,
        createGnosisSignerFactory: jest.fn(original.createGnosisSignerFactory),
        createSignerFactory: jest.fn(original.createSignerFactory),
    }
})

const hreRunSpy = jest.spyOn(hre, 'run')
const promptToContinueMock = promptToContinue as jest.Mock
const createGnosisSignerFactoryMock = createGnosisSignerFactory as jest.Mock
const createSignerFactoryMock = createSignerFactory as jest.Mock

describe(`task ${TASK_LZ_OAPP_WIRE}`, () => {
    // Helper matcher object that checks for OmniPoint objects
    const expectOmniPoint = { address: expect.any(String), eid: expect.any(Number) }
    // Helper matcher object that checks for OmniTransaction objects
    const expectTransaction = { data: expect.any(String), point: expectOmniPoint, description: expect.any(String) }
    const expectTransactionWithReceipt = { receipt: expect.any(Object), transaction: expectTransaction }
    const expectLogger = expect.objectContaining({
        info: expect.any(Function),
        warn: expect.any(Function),
        error: expect.any(Function),
        debug: expect.any(Function),
        verbose: expect.any(Function),
    })

    const CONFIGS_BASE_DIR = relative(cwd(), join(__dirname, '__data__', 'configs'))
    const configPathFixture = (fileName: string): string => {
        const path = join(CONFIGS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    beforeEach(async () => {
        promptToContinueMock.mockReset()
        createGnosisSignerFactoryMock.mockClear()
        createSignerFactoryMock.mockClear()
        hreRunSpy.mockClear()
    })

    describe('with invalid configs', () => {
        beforeAll(async () => {
            await deployContract('OApp')
        })

        it('should fail if the config file does not exist', async () => {
            await expect(
                hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig: './does-not-exist.js' })
            ).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a file', async () => {
            const oappConfig = dirname(configPathFixture('invalid.config.empty.json'))

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a valid JSON or JS file', async () => {
            const oappConfig = 'README.md'

            expect(isFile(oappConfig)).toBeTruthy()

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JSON file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.json')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JS file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with a malformed JS file (001)', async () => {
            const oappConfig = configPathFixture('invalid.config.001.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with a misconfigured file (001)', async () => {
            const oappConfig = configPathFixture('valid.config.misconfigured.001.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })).rejects.toMatchSnapshot()
        })
    })

    describe('with valid configs', () => {
        beforeEach(async () => {
            await deployContract('OApp')
        })

        it('should accept a path without an extension', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should exit if there is nothing to wire', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should work with absolute paths', async () => {
            const oappConfigAbsolute = configPathFixture('valid.config.empty.js')
            const oappConfig = resolve(oappConfigAbsolute)

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should work with typescript', async () => {
            const oappConfig = configPathFixture('valid.config.empty.ts')

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should not ask the user for input if --ci flag is truthy and execute all transactions', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, ci: true })

            expect(result).toEqual([[expectTransactionWithReceipt, expectTransactionWithReceipt], [], []])
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should ask the user whether they want to see the transactions & continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(true)

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return a list of pending transactions if the user decides not to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            expect(successful).toEqual([])
            expect(errors).toEqual([])
            expect(pending).toHaveLength(2)
            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return a list of pending transactions if running in dry run mode', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, {
                logLevel: 'warn',
                oappConfig,
                dryRun: true,
            })

            expect(successful).toEqual([])
            expect(errors).toEqual([])
            expect(pending).toHaveLength(2)
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should set a failure exit code and return a list of pending transactions if running in assert mode', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, {
                logLevel: 'warn',
                oappConfig,
                assert: true,
            })

            expect(successful).toEqual([])
            expect(errors).toEqual([])
            expect(pending).toHaveLength(2)
            expect(promptToContinueMock).not.toHaveBeenCalled()

            expect(process.exitCode).toBe(1)
        })

        it('should return a list of transactions if the user decides to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            const [successful, errors] = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

            const expectTransactionWithReceipt = { receipt: expect.any(Object), transaction: expect.any(Object) }

            expect(successful).toEqual([expectTransactionWithReceipt, expectTransactionWithReceipt])
            expect(errors).toEqual([])
        })

        it('should use a named signer if a signer name is passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')
            const signer = { type: 'named', name: 'wombat' }

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, signer })

            expect(createSignerFactoryMock).toHaveBeenCalledOnce()
            expect(createSignerFactoryMock).toHaveBeenCalledWith(signer)
        })

        it('should use a named safe signer if a signer name is passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')
            const signer = { type: 'named', name: 'wombat' }

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, safe: true, signer })

            expect(createGnosisSignerFactory).toHaveBeenCalledOnce()
            expect(createGnosisSignerFactory).toHaveBeenCalledWith(signer)
        })

        it('should use gnosis safe signer if --safe flag is passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, safe: true })

            expect(createGnosisSignerFactory).toHaveBeenCalledOnce()

            // Get the created gnosis signer factory
            const createSigner = createGnosisSignerFactoryMock.mock.results[0]?.value
            expect(typeof createSigner).toBe('function')

            // Now we check that the sign and send subtask has been called with the correct signer factory
            expect(hreRunSpy).toHaveBeenCalledWith(
                SUBTASK_LZ_SIGN_AND_SEND,
                {
                    transactions: expect.any(Array),
                    ci: false,
                    createSigner,
                    logger: expectLogger,
                },
                {},
                undefined
            )
        })

        it('should use gnosis safe signer with index if --safe flag and --signer are passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')
            const [signer] = await hre.getUnnamedAccounts()

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, {
                logLevel: 'warn',
                oappConfig,
                safe: true,
                signer: { type: 'address', address: signer },
            })

            expect(createGnosisSignerFactory).toHaveBeenCalledOnce()
            expect(createGnosisSignerFactory).toHaveBeenCalledWith({ type: 'address', address: signer })

            // Get the created gnosis signer factory
            const createSigner = createGnosisSignerFactoryMock.mock.results[0]?.value
            expect(typeof createSigner).toBe('function')

            // Now we check that the sign and send subtask has been called with the correct signer factory
            expect(hreRunSpy).toHaveBeenCalledWith(
                SUBTASK_LZ_SIGN_AND_SEND,
                {
                    transactions: expect.any(Array),
                    ci: false,
                    createSigner,
                    logger: expectLogger,
                },
                {},
                undefined
            )
        })

        it('should use signer index if --signer is passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, signer: 0 })

            expect(createSignerFactory).toHaveBeenCalledOnce()
            expect(createSignerFactory).toHaveBeenCalledWith(0)

            // Get the created signer factory
            const createSigner = createSignerFactoryMock.mock.results[0]?.value
            expect(typeof createSigner).toBe('function')

            // Now we check that the sign and send subtask has been called with the correct signer factory
            expect(hreRunSpy).toHaveBeenCalledWith(
                SUBTASK_LZ_SIGN_AND_SEND,
                {
                    transactions: expect.any(Array),
                    ci: false,
                    createSigner,
                    logger: expectLogger,
                },
                {},
                undefined
            )
        })

        it('should use signer address if --signer is passed', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')
            const [signer] = await hre.getUnnamedAccounts()

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, signer })

            expect(createSignerFactory).toHaveBeenCalledOnce()
            expect(createSignerFactory).toHaveBeenCalledWith(signer)

            // Get the created signer factory
            const createSigner = createSignerFactoryMock.mock.results[0]?.value
            expect(typeof createSigner).toBe('function')

            // Now we check that the sign and send subtask has been called with the correct signer factory
            expect(hreRunSpy).toHaveBeenCalledWith(
                SUBTASK_LZ_SIGN_AND_SEND,
                {
                    transactions: expect.any(Array),
                    ci: false,
                    createSigner,
                    logger: expectLogger,
                },
                {},
                undefined
            )
        })

        it('should work if an external contract is used in `to` of a connection', async () => {
            const oappConfig = configPathFixture('valid.config.connected.external.connection.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, ci: true })

            expect(result).toEqual([
                [expectTransactionWithReceipt, expectTransactionWithReceipt, expectTransactionWithReceipt],
                [],
                [],
            ])
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        describe('if a transaction fails', () => {
            let sendTransactionMock: jest.SpyInstance

            beforeEach(() => {
                sendTransactionMock = jest.spyOn(JsonRpcSigner.prototype, 'sendTransaction')
            })

            afterEach(() => {
                sendTransactionMock.mockRestore()
            })

            it('should set the exit code to 1', async () => {
                const error = new Error('Oh god dammit')

                // We want to make the transaction fail
                sendTransactionMock.mockRejectedValue(error)

                const oappConfig = configPathFixture('valid.config.connected.js')
                await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig, ci: true })

                expect(process.exitCode).toBe(1)
            })

            it('should return a list of failed transactions in the CI mode', async () => {
                const error = new Error('Oh god dammit')

                // We want to make the transaction fail
                sendTransactionMock.mockRejectedValue(error)

                const oappConfig = configPathFixture('valid.config.connected.js')
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, {
                    logLevel: 'warn',
                    oappConfig,
                    ci: true,
                })

                // The transactions are being grouped by chain and signed in parallel
                // so we expect one failure per chain
                expect(errors).toEqual([
                    {
                        error,
                        transaction: expectTransaction,
                    },
                    {
                        error,
                        transaction: expectTransaction,
                    },
                ])

                // Since we failed on the first transaction, we expect
                // all the transaction to still be pending and none of them to be successful
                expect(successful).toEqual([])
                expect(pending).toEqual([expectTransaction, expectTransaction])
            })

            it('should ask the user to retry if not in the CI mode', async () => {
                const error = new Error('Oh god dammit')

                // Mock the first sendTransaction call to reject, the rest should use the original implementation
                //
                // This way we simulate a situation in which the first call would fail but then the user retries, it would succeed
                sendTransactionMock.mockRejectedValueOnce(error)

                // In the non-CI mode we need to answer the prompts
                promptToContinueMock
                    .mockResolvedValueOnce(false) // We don't want to see the list of transactions
                    .mockResolvedValueOnce(true) // We want to continue
                    .mockResolvedValueOnce(true) // We want to see the list of failed transactions
                    .mockResolvedValueOnce(true) // We want to retry

                const oappConfig = configPathFixture('valid.config.connected.js')
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

                // Check that the user has been asked to retry
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to preview the failed transactions?`)
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to retry?`, true)

                // After retrying, the signer should not fail anymore
                expect(successful).toEqual([expectTransactionWithReceipt, expectTransactionWithReceipt])
                expect(errors).toEqual([])
                expect(pending).toEqual([])
            })

            it('should not retry if the user decides not to if not in the CI mode', async () => {
                const error = new Error('Oh god dammit')

                // Mock the first sendTransaction call to reject, the rest should use the original implementation
                //
                // This way we simulate a situation in which the first call would fail but then the user retries, it would succeed
                sendTransactionMock.mockRejectedValueOnce(error)

                // In the non-CI mode we need to answer the prompts
                promptToContinueMock
                    .mockResolvedValueOnce(false) // We don't want to see the list of transactions
                    .mockResolvedValueOnce(true) // We want to continue
                    .mockResolvedValueOnce(false) // We don't want to see the list of failed transactions
                    .mockResolvedValueOnce(false) // We don't want to retry

                const oappConfig = configPathFixture('valid.config.connected.js')
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

                // Check that the user has been asked to retry
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to preview the failed transactions?`)
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to retry?`, true)

                // Check that we got the failures back
                expect(errors).toEqual([
                    {
                        error,
                        transaction: expectTransaction,
                    },
                ])

                // Since we failed on the first transaction (on one chain only),
                // we expect one transaction on the other chain to go though just fine
                // and the failed one to appear in the pending array
                expect(successful).toEqual([expectTransactionWithReceipt])
                expect(pending).toEqual([expectTransaction])
            })

            it('should not retry successful transactions', async () => {
                const error = new Error('Oh god dammit')

                // Mock the second & third sendTransaction call to reject
                //
                // This way we simulate a situation in which the first call goes through,
                // then the second and third calls reject
                sendTransactionMock
                    .mockImplementationOnce(sendTransactionMock.getMockImplementation()!)
                    .mockRejectedValueOnce(error)
                    .mockRejectedValueOnce(error)

                // In the non-CI mode we need to answer the prompts
                promptToContinueMock
                    .mockResolvedValueOnce(false) // We don't want to see the list of transactions
                    .mockResolvedValueOnce(true) // We want to continue
                    .mockResolvedValueOnce(true) // We want to see the list of failed transactions
                    .mockResolvedValueOnce(true) // We want to retry
                    .mockResolvedValueOnce(true) // We want to see the list of failed transactions
                    .mockResolvedValueOnce(true) // We want to retry

                const oappConfig = configPathFixture('valid.config.connected.js')
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { logLevel: 'warn', oappConfig })

                // Check that the user has been asked to retry
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to preview the failed transactions?`)
                expect(promptToContinueMock).toHaveBeenCalledWith(`Would you like to retry?`, true)

                // After retrying, the signer should not fail anymore
                expect(successful).toEqual([expectTransactionWithReceipt, expectTransactionWithReceipt])
                expect(errors).toEqual([])
                expect(pending).toEqual([])

                expect(sendTransactionMock).toHaveBeenCalledTimes(
                    // The first successful call
                    1 +
                        // The first failed call
                        1 +
                        // The retry of the failed call
                        1 +
                        // The retry of the failed call
                        1
                )
            })
        })
    })

    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'task', 'oapp', 'config.test.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        beforeEach(async () => {
            await deployContract('EndpointV2', true)
            await setupDefaultEndpointV2()
        })

        it('should use custom config loading task', async () => {
            const result = runExpect('config-custom-config-loading')

            expect(result.status).toBe(0)
        })

        it('should exit with code 1 if in assert mode', async () => {
            const result = runExpect('assert')

            expect(result.status).toBe(0)
        })
    })
})
