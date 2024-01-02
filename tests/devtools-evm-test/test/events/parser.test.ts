import { parseLogs, parseLogsWithName } from '@layerzerolabs/devtools-evm'
import fc from 'fast-check'
import { HardhatContext } from 'hardhat/internal/context'
import { Contract } from '@ethersproject/contracts'
import hre from 'hardhat'

describe('events/parser', () => {
    const EMITTER = 'Emitter'
    const CHILD_EMITTER = `Child${EMITTER}`
    const PARALLEL_EMITTER = `Parallel${EMITTER}`

    let parent: Contract
    let child: Contract
    let parallel: Contract

    beforeAll(async () => {
        const parentFactory = await hre.ethers.getContractFactory(EMITTER)
        parent = await parentFactory.deploy()

        const childFactory = await hre.ethers.getContractFactory(CHILD_EMITTER)
        child = await childFactory.deploy()

        const parallelFactory = await hre.ethers.getContractFactory(PARALLEL_EMITTER)
        parallel = await parallelFactory.deploy()
    })

    afterAll(() => {
        HardhatContext.deleteHardhatContext()
    })

    it('parent no arg event', async () => {
        // only the parent should emit the event
        const receipt = await (await parent.emitNoArgEvent()).wait()
        expect(parseLogs(receipt, parent)).toMatchSnapshot()
        expect(parseLogsWithName(receipt, parent, 'NoArgEvent')).toHaveLength(1)
        expect(parseLogsWithName(receipt, child, 'NoArgEvent')).toEqual([])
    })

    it('child no arg event', async () => {
        const receipt = await (await child.emitNoArgEvent()).wait()
        expect(parseLogs(receipt, parent)).toMatchSnapshot()
        expect(parseLogsWithName(receipt, parent, 'NoArgEvent')).toEqual([]) // only the child should emit the event
        expect(parseLogsWithName(receipt, child, 'NoArgEvent')).toHaveLength(1)
        expect(parseLogsWithName(receipt, parallel, 'NoArgEvent')).toEqual([]) // parallel logs should be empty

        fc.assert(
            fc.property(fc.string(), (name) => {
                fc.pre(name !== 'NoArgEvent')
                expect(parseLogsWithName(receipt, parent, name)).toEqual([])
            })
        )
    })

    it('child one arg event', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0 }), async (arg) => {
                const receipt = await (await child.emitOneArgEvent(arg)).wait()
                expect(parseLogsWithName(receipt, parent, 'OneArgEvent')).toEqual([])
                fc.assert(
                    fc.property(fc.string(), (name) => {
                        fc.pre(name !== 'OneArgEvent')

                        expect(parseLogsWithName(receipt, parent, name)).toEqual([])
                    })
                )
            })
        )
    })

    it('child many arg event', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0, max: 10 }), async (count) => {
                const receipt = await (await child.emitMany(count)).wait()
                await Promise.all(
                    ['NoArgEvent', 'OneArgEvent', 'FourArgEvent'].map((eventName) => {
                        expect(parseLogsWithName(receipt, child, eventName)).toHaveLength(count)
                        expect(parseLogsWithName(receipt, parent, eventName)).toEqual([])
                    })
                )
                fc.assert(
                    fc.property(fc.string(), (name) => {
                        fc.pre(name !== 'FourArgEvent')
                        expect(parseLogsWithName(receipt, parent, name)).toEqual([])
                    })
                )
            })
        )
    })

    it('child-specific contract event', async () => {
        const receipt = await (await child.emitChildSpecificEvent()).wait()
        expect(parseLogsWithName(receipt, parent, 'ChildSpecificEvent')).toEqual([])
        expect(parseLogsWithName(receipt, child, 'ChildSpecificEvent')).toHaveLength(1)
    })
})
