import { parseLogs, parseLogsWithName } from '@layerzerolabs/devtools-evm'
import fc from 'fast-check'
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

    it('not parse an event with one arg from a different contract', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0 }), async (arg) => {
                const receipt = await (await child.emitOneArgEvent(arg)).wait()
                expect(parseLogsWithName(receipt, parent, 'OneArgEvent')).toEqual([])
            }),
            { numRuns: 10 }
        )
    })

    it('not parse an event with one arg with unknown name', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0 }), fc.string(), async (arg, name) => {
                fc.pre(name !== 'OneArgEvent')

                const receipt = await (await child.emitOneArgEvent(arg)).wait()
                expect(parseLogsWithName(receipt, parent, name)).toEqual([])
            }),
            { numRuns: 10 }
        )
    })

    it('not parse an event with many args from a different contract', async () => {
        const eventNameArbitrary = fc.constantFrom('NoArgEvent', 'OneArgEvent', 'FourArgEvent')

        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0, max: 10 }), eventNameArbitrary, async (count, name) => {
                const receipt = await (await child.emitMany(count)).wait()

                expect(parseLogsWithName(receipt, child, name)).toHaveLength(count)
                expect(parseLogsWithName(receipt, parent, name)).toEqual([])
            }),
            { numRuns: 10 }
        )
    })

    it('not parse an event with many args with unknown name from a different contract', async () => {
        await fc.assert(
            fc.asyncProperty(fc.integer({ min: 0, max: 10 }), fc.string(), async (count, name) => {
                fc.pre(name !== 'NoArgEvent')
                fc.pre(name !== 'OneArgEvent')
                fc.pre(name !== 'FourArgEvent')

                const receipt = await (await child.emitMany(count)).wait()

                expect(parseLogsWithName(receipt, parent, name)).toEqual([])
            }),
            { numRuns: 10 }
        )
    })

    it('child-specific contract event', async () => {
        const receipt = await (await child.emitChildSpecificEvent()).wait()
        expect(parseLogsWithName(receipt, parent, 'ChildSpecificEvent')).toEqual([])
        expect(parseLogsWithName(receipt, child, 'ChildSpecificEvent')).toHaveLength(1)
    })
})
