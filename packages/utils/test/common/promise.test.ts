/// <reference types="jest-extended" />

import fc from 'fast-check'
import { first, firstFactory, sequence } from '@/common/promise'

describe('common/promise', () => {
    const valueArbitrary = fc.anything()
    const valuesArbitrary = fc.array(valueArbitrary)

    describe('sequence', () => {
        it('should resolve with an empty array if called with an empty array', async () => {
            expect(await sequence([])).toEqual([])
        })

        it('should resolve if all resolve', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, async (values) => {
                    const tasks = values.map((value) => jest.fn().mockResolvedValue(value))

                    expect(await sequence(tasks)).toEqual(values)

                    // Make sure all the tasks got called
                    for (const task of tasks) {
                        expect(task).toHaveBeenCalledTimes(1)
                        expect(task).toHaveBeenCalledWith()
                    }
                })
            )
        })

        it('should reject with the first rejection', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, valueArbitrary, valuesArbitrary, async (values1, error, values2) => {
                    const tasks1 = values1.map((value) => jest.fn().mockResolvedValue(value))
                    const failingTask = jest.fn().mockRejectedValue(error)
                    const tasks2 = values2.map((value) => jest.fn().mockResolvedValue(value))
                    const tasks = [...tasks1, failingTask, ...tasks2]

                    await expect(sequence(tasks)).rejects.toBe(error)

                    // Make sure the first batch got called
                    for (const task of tasks1) {
                        expect(task).toHaveBeenCalledTimes(1)
                        expect(task).toHaveBeenCalledWith()
                    }

                    // Make sure the failing task got called
                    expect(failingTask).toHaveBeenCalledTimes(1)
                    expect(failingTask).toHaveBeenCalledWith()

                    // Make sure the second batch didn't get called
                    for (const task of tasks2) {
                        expect(task).not.toHaveBeenCalled()
                    }
                })
            )
        })

        it('should execute one by one', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, async (values) => {
                    fc.pre(values.length > 0)

                    const tasks = values.map((value) => jest.fn().mockResolvedValue(value))

                    await sequence(tasks)

                    tasks.reduce((task1, task2) => {
                        return expect(task1).toHaveBeenCalledBefore(task2), task2
                    })
                })
            )
        })
    })

    describe('first', () => {
        it('should reject if called with no factories', async () => {
            await expect(first()).rejects.toThrow('Must have at least one task for first()')
        })

        it('should resolve if the first task resolves', async () => {
            await fc.assert(
                fc.asyncProperty(valueArbitrary, valuesArbitrary, async (value, errors) => {
                    const task = jest.fn().mockResolvedValue(value)
                    const tasks = errors.map((error) => jest.fn().mockRejectedValue(error))

                    expect(await first(task, ...tasks)).toBe(value)

                    // Make sure none of the other factories got called
                    for (const factory of tasks) {
                        expect(factory).not.toHaveBeenCalled()
                    }
                })
            )
        })

        it('should resolve with the first successful task', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, valueArbitrary, async (errors, value) => {
                    const tasks = errors.map((error) => jest.fn().mockRejectedValue(error))
                    const task = jest.fn().mockResolvedValue(value)

                    expect(await first(...tasks, task)).toBe(value)

                    // Make sure all the tasks got called
                    for (const factory of tasks) {
                        expect(factory).toHaveBeenCalledTimes(1)
                    }

                    expect(task).toHaveBeenCalledTimes(1)
                })
            )
        })

        it('should reject with the last rejected task error', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, valueArbitrary, async (errors, error) => {
                    const tasks = errors.map((error) => jest.fn().mockRejectedValue(error))
                    const task = jest.fn().mockRejectedValue(error)

                    await expect(first(...tasks, task)).rejects.toBe(error)

                    // Make sure all the tasks got called
                    for (const factory of tasks) {
                        expect(factory).toHaveBeenCalledTimes(1)
                    }

                    expect(task).toHaveBeenCalledTimes(1)
                })
            )
        })
    })

    describe('firstFactory', () => {
        it('should throw an error if called with no factories', async () => {
            await expect(firstFactory()).rejects.toThrow('Must have at least one task for first()')
        })

        it('should resolve if the first factory resolves', async () => {
            await fc.assert(
                fc.asyncProperty(valueArbitrary, valuesArbitrary, async (value, values) => {
                    const successful = jest.fn().mockResolvedValue(value)
                    const successfulOther = values.map((value) => jest.fn().mockResolvedValue(value))
                    const factory = firstFactory(successful, ...successfulOther)

                    expect(await factory()).toBe(value)

                    // Make sure none of the other factories got called
                    for (const factory of successfulOther) {
                        expect(factory).not.toHaveBeenCalled()
                    }
                })
            )
        })

        it('should resolve with the first successful factory', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, valueArbitrary, async (errors, value) => {
                    const failing = errors.map((error) => jest.fn().mockRejectedValue(error))
                    const successful = jest.fn().mockResolvedValue(value)
                    const factory = firstFactory(...failing, successful)

                    expect(await factory()).toBe(value)

                    // Make sure all the tasks got called
                    for (const factory of failing) {
                        expect(factory).toHaveBeenCalledTimes(1)
                    }
                })
            )
        })

        it('should pass the input to factories', async () => {
            await fc.assert(
                fc.asyncProperty(valuesArbitrary, valueArbitrary, valuesArbitrary, async (errors, value, args) => {
                    const failing = errors.map((error) => jest.fn().mockRejectedValue(error))
                    const successful = jest.fn().mockResolvedValue(value)
                    const factory = firstFactory(...failing, successful)

                    expect(await factory(...args)).toBe(value)

                    // Make sure all the tasks got called with the correct arguments
                    for (const factory of failing) {
                        expect(factory).toHaveBeenCalledTimes(1)
                        expect(factory).toHaveBeenCalledWith(...args)
                    }

                    expect(successful).toHaveBeenCalledTimes(1)
                    expect(successful).toHaveBeenCalledWith(...args)
                })
            )
        })
    })
})
