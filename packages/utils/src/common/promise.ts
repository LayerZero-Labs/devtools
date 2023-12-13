import { Factory } from '@/types'
import assert from 'assert'

/**
 * Helper type for argumentless factories a.k.a. tasks
 */
type Task<T> = Factory<[], T>

/**
 * Executes tasks in sequence, waiting for each one to finish before starting the next one
 *
 * Will resolve with the output of all tasks or reject with the first rejection.
 *
 * @param {Task<T>[]} tasks
 * @returns {Promise<T[]>}
 */
export const sequence = async <T>(tasks: Task<T>[]): Promise<T[]> => {
    const collector: T[] = []

    for (const task of tasks) {
        collector.push(await task())
    }

    return collector
}

/**
 * Executes tasks in a sequence until one resolves.
 *
 * Will resolve with the output of the first task that resolves
 * or reject with the last rejection.
 *
 * Will reject immediatelly if no tasks have been passed
 *
 * @param {Task<T>[]} tasks
 * @returns {Promise<T>}
 */
export const first = async <T>(tasks: Task<T>[]): Promise<T> => {
    assert(tasks.length !== 0, `Must have at least one task for first()`)

    let lastError: unknown

    for (const task of tasks) {
        try {
            return await task()
        } catch (error) {
            lastError = error
        }
    }

    throw lastError
}

/**
 * Helper utility for currying first() - creating a function
 * that behaves like first() but accepts arguments that will be passed to the factory functions
 *
 * @param {Factory<TInput, TOutput>[]} factories
 * @returns {Factory<TInput, TOutput>}
 */
export const firstFactory =
    <TInput extends unknown[], TOutput>(...factories: Factory<TInput, TOutput>[]): Factory<TInput, TOutput> =>
    async (...input) =>
        await first(factories.map((factory) => () => factory(...input)))
