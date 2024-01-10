import hre from 'hardhat'
import { isFile, promptToContinue } from '@layerzerolabs/io-devtools'
import { relative, resolve } from 'path'
import { TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployOAppFixture } from '../../__utils__/oapp'
import { cwd } from 'process'
import { JsonRpcSigner } from '@ethersproject/providers'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

const promptToContinueMock = promptToContinue as jest.Mock

describe('task/oapp/wire', () => {
    // Helper matcher object that checks for OmniPoint objects
    const expectOmniPoint = { address: expect.any(String), eid: expect.any(Number) }
    // Helper matcher object that checks for OmniTransaction objects
    const expectTransaction = { data: expect.any(String), point: expectOmniPoint }
    const expectTransactionWithReceipt = { receipt: expect.any(Object), transaction: expectTransaction }

    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    beforeEach(async () => {
        promptToContinueMock.mockReset()
    })

    describe('with invalid configs', () => {
        beforeAll(async () => {
            await deployOAppFixture()
        })

        it('should fail if the config file does not exist', async () => {
            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig: './does-not-exist.js' })).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a file', async () => {
            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig: __dirname })).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a valid JSON or JS file', async () => {
            const readme = resolve(__dirname, '..', '..', '..', 'README.md')

            expect(isFile(readme)).toBeTruthy()

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig: readme })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JSON file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.json')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JS file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with a malformed JS file (001)', async () => {
            const oappConfig = configPathFixture('invalid.config.001.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with a misconfigured file (001)', async () => {
            const oappConfig = configPathFixture('valid.config.misconfigured.001.js')

            await expect(hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })).rejects.toMatchSnapshot()
        })
    })

    describe('with valid configs', () => {
        beforeEach(async () => {
            await deployOAppFixture()
        })

        it('should exit if there is nothing to wire', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should work with relative paths', async () => {
            const oappConfigAbsolute = configPathFixture('valid.config.empty.js')
            const oappConfig = relative(cwd(), oappConfigAbsolute)

            await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should work with typescript', async () => {
            const oappConfig = configPathFixture('valid.config.empty.ts')

            await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should have debug output if requested (so called eye test, check the test output)', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, logLevel: 'debug' })

            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should not ask the user for input if --ci flag is truthy and execute all transactions', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })

            expect(result).toEqual([[expectTransactionWithReceipt, expectTransactionWithReceipt], [], []])
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should ask the user whether they want to see the transactions & continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(true)

            await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return a list of pending transactions if the user decides not to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            expect(successful).toEqual([])
            expect(errors).toEqual([])
            expect(pending).toHaveLength(2)
            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return a list of transactions if the user decides to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            const [successful, errors] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

            const expectTransactionWithReceipt = { receipt: expect.any(Object), transaction: expect.any(Object) }

            expect(successful).toEqual([expectTransactionWithReceipt, expectTransactionWithReceipt])
            expect(errors).toEqual([])
        })

        describe('if a transaction fails', () => {
            let sendTransactionMock: jest.SpyInstance

            beforeEach(() => {
                sendTransactionMock = jest.spyOn(JsonRpcSigner.prototype, 'sendTransaction')
            })

            afterEach(() => {
                sendTransactionMock.mockRestore()
            })

            it('should return a list of failed transactions in the CI mode', async () => {
                const error = new Error('Oh god dammit')

                // We want to make the fail
                sendTransactionMock.mockRejectedValue(error)

                const oappConfig = configPathFixture('valid.config.connected.js')
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })

                expect(errors).toEqual([
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
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

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
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

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

                // Since we failed on the first transaction, we expect
                // all the transaction to still be pending and none of them to be successful
                expect(successful).toEqual([])
                expect(pending).toEqual([expectTransaction, expectTransaction])
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
                const [successful, errors, pending] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })

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
})
