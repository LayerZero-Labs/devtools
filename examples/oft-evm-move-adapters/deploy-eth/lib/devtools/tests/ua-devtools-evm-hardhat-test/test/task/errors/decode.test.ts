import hre from 'hardhat'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { TASK_LZ_ERRORS_DECODE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { printRecord } from '@layerzerolabs/io-devtools/swag'
import { CustomError, PanicError, RevertError, UnknownError } from '@layerzerolabs/devtools-evm'

jest.mock('@layerzerolabs/io-devtools/swag', () => ({
    printRecord: jest.fn(),
    printLogo: jest.fn(),
}))

const printRecordMock = printRecord as jest.Mock
const runMock = jest.spyOn(hre, 'run')

describe(`task ${TASK_LZ_ERRORS_DECODE}`, () => {
    beforeEach(() => {
        printRecordMock.mockReset()
        runMock.mockClear()
    })

    it('should compile contracts', async () => {
        await hre.run(TASK_LZ_ERRORS_DECODE, { hash: '' })

        // For some reason even though we did not specify any arguments to the compile task,
        // jest still sees some arguments being passed so we need to pass those to make this expect work
        expect(runMock).toHaveBeenCalledWith(TASK_COMPILE, undefined, {}, undefined)
    })

    it('should not print anything if the error cannot be decoded', async () => {
        const result = await hre.run(TASK_LZ_ERRORS_DECODE, { hash: '0x0' })

        expect(result).toBeInstanceOf(UnknownError)
        expect(printRecordMock).not.toHaveBeenCalled()
    })

    it('should print PanicError details', async () => {
        const result = await hre.run(TASK_LZ_ERRORS_DECODE, {
            hash: '0x4e487b710000000000000000000000000000000000000000000000000000000000000006',
        })

        expect(result).toBeInstanceOf(PanicError)
        expect(printRecordMock).toHaveBeenCalledTimes(1)
        expect(printRecordMock.mock.calls[0]).toMatchSnapshot()
    })

    it('should print RevertError details', async () => {
        const result = await hre.run(TASK_LZ_ERRORS_DECODE, {
            hash: '0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000066d79206261640000000000000000000000000000000000000000000000000000',
        })

        expect(result).toBeInstanceOf(RevertError)
        expect(printRecordMock).toHaveBeenCalledTimes(1)
        expect(printRecordMock.mock.calls[0]).toMatchSnapshot()
    })

    it('should print CustomError details', async () => {
        const result = await hre.run(TASK_LZ_ERRORS_DECODE, { hash: '0x447516e1' })

        expect(result).toBeInstanceOf(CustomError)
        expect(printRecordMock).toHaveBeenCalledTimes(1)
        expect(printRecordMock.mock.calls[0]).toMatchSnapshot()
    })

    it.each(['0x645f0f4f', '0x0dc652a8'])('should print CustomError details if the error is %s', async (hash) => {
        const result = await hre.run(TASK_LZ_ERRORS_DECODE, { hash })

        expect(result).toBeInstanceOf(CustomError)
        expect(printRecordMock).toHaveBeenCalledTimes(1)
        expect(printRecordMock.mock.calls[0]).toMatchSnapshot()
    })
})
