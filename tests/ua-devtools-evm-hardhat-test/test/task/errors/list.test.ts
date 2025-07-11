import hre from 'hardhat'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { TASK_LZ_ERRORS_LIST } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { printVerticalTable } from '@layerzerolabs/io-devtools/swag'

jest.mock('@layerzerolabs/io-devtools/swag', () => ({
    printVerticalTable: jest.fn(),
    printLogo: jest.fn(),
}))

const printTableMock = printVerticalTable as jest.Mock
const runMock = jest.spyOn(hre, 'run')

describe(`task ${TASK_LZ_ERRORS_LIST}`, () => {
    beforeEach(() => {
        printTableMock.mockReset()
        runMock.mockClear()
    })

    it('should compile contracts', async () => {
        await hre.run(TASK_LZ_ERRORS_LIST, {})

        // For some reason even though we did not specify any arguments to the compile task,
        // jest still sees some aarguments being passed so we need to pass those to make this expect work
        expect(runMock).toHaveBeenCalledWith(TASK_COMPILE, undefined, {}, undefined)
    })

    it('should not print anything if there are no matching errors', async () => {
        await hre.run(TASK_LZ_ERRORS_LIST, { containing: 'idontexist' })

        expect(printTableMock).not.toHaveBeenCalled()
    })

    it('should print all matching errors if `containing` argument is not supplied', async () => {
        await hre.run(TASK_LZ_ERRORS_LIST, { containing: undefined })

        expect(printTableMock).toHaveBeenCalledTimes(1)
        expect(printTableMock.mock.calls[0]).toBeDefined()
    })

    it('should print all errors with matching name if `containing` argument is supplied', async () => {
        await hre.run(TASK_LZ_ERRORS_LIST, { containing: 'Invalid' })

        expect(printTableMock).toHaveBeenCalledTimes(1)
        expect(printTableMock.mock.calls[0]).toBeDefined()
    })

    it('should print all errors with matching signature if `containing` argument is supplied', async () => {
        await hre.run(TASK_LZ_ERRORS_LIST, { containing: '0x447516e1' })

        expect(printTableMock).toHaveBeenCalledTimes(1)
        expect(printTableMock.mock.calls[0]).toBeDefined()
    })
})
