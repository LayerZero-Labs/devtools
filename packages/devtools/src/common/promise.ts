import { Factory } from '@/types'
import { Logger } from '@layerzerolabs/io-devtools'
import assert from 'assert'
import { backOff } from 'exponential-backoff'

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
 * Executes tasks in parallel
 *
 * Will resolve with the output of all tasks or reject with the any rejection.
 *
 * @param {Task<T>[]} tasks
 * @returns {Promise<T[]>}
 */
export const parallel = async <T>(tasks: Task<T>[]): Promise<T[]> => await Promise.all(tasks.map((task) => task()))

/**
 * Creates a default applicative based on an environment feature flag.
 *
 * For now we keep the parallel execution as an opt-in feature flag
 * before we have a retry logic fully in place for the SDKs
 *
 * This is to avoid 429 too many requests errors from the RPCs
 *
 * @param logger
 * @returns
 */
export const createDefaultApplicative = (logger?: Logger) =>
    process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION
        ? (logger?.warn(`You are using experimental parallel configuration`), parallel)
        : sequence

/**
 * Maps the errors coming from a task. Errors thrown from the `toError`
 * callback will not be caught.
 *
 * ```
 * const functionThatMightThrow = () => sdk.getSomeAttribute()
 *
 * const result = await mapError(functionThatMightThrow, (error) => new Error(`Error produced: ${error}`))
 * ```
 *
 * @template T
 * @template E
 * @param {(error: unknown) => E} toError Error mapping function
 */
export const mapError = async <T, E = unknown>(task: Task<T>, toError: (error: unknown) => E): Promise<Awaited<T>> => {
    try {
        return await task()
    } catch (error: unknown) {
        throw toError(error)
    }
}

/**
 * Intercepts any errors coming from a task. The return value
 * of this call will be the return value of the task
 * and the rejected value will be the original erorr.
 *
 * Any errors or rejections from the `onError` callback will be caught
 * and the original error will be rethrown.
 *
 * ```
 * const functionThatMightThrow = () => sdk.getSomeAttribute()
 *
 * // With custom logging
 * const result = await tapError(functionThatMightThrow, (error) => console.error('Something went wrong:', error))
 *
 * // For lazy people
 * const result = await tapError(functionThatMightThrow, console.error)
 * ```
 *
 * @param {Factory<[error: unknown], void>} onError Synchronous or asynchronous error callback
 */
export const tapError = async <T>(task: Task<T>, onError: Factory<[error: unknown], void>): Promise<Awaited<T>> => {
    try {
        return await task()
    } catch (error: unknown) {
        try {
            await onError(error)
        } catch {
            // Ignore the error from the callback since the original error
            // is probably more informative
        }

        throw error
    }
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

/**
 * RetryStrategy represents a function that, when passed to `createRetryFactory`,
 * controls the execution of a retried function.
 *
 * It will be executed on every failed attempt and has the ability to modify the
 * input originally passed to the retried function.
 *
 * In its simplest form, it will either return `true` (to retry again) or `false` (stop retrying).
 *
 * In its advanced form, it can use the parameters passed to it to create
 * a new set of arguments passed to the function being retried:
 *
 * ```
 * // As a simple example let's consider a function
 * // whose argument is the amount of money we want to pay for a service
 * const functionThatCanFail = (money: number): Promise<void> => { ... }
 *
 * // We can create a strategy that will keep adding 1 to the amount of money
 * const strategy: RetryStrategy<[money: number]> = (attempt, error, [previousMoney], [originalMoney]) => [previousMoney + 1]
 *
 * // Or we can create a strategy that will adjust the money based on the initial value
 * //
 * // In this made up case it will take the original amount and will add 2 for every failed attempt
 * const strategy: RetryStrategy<[money: number]> = (attempt, error, [previousMoney], [originalMoney]) => [originalMoney + attempt * 2]
 *
 * // Or we can go insane with our logic and can, because without objective morality
 * // everything is permissible, update the amount on every other attempt
 * const strategy: RetryStrategy<[money: number]> = (attempt, error, [previousMoney], [originalMoney]) => attempt % 2 ? [previousMoney + 1] : true
 * ```
 *
 * @param {number} attempt The 0-indexed attempt that the retry function is performing
 * @param {unknown} error The error thrown from the previous execution of the retried function
 * @param {TInput} previousInput The input passed to the previous execution of the retried function
 * @param {TInput} originalInput The input passed to the first execution of the retried function
 */
type RetryStrategy<TInput extends unknown[]> = Factory<
    [attempt: number, error: unknown, previousInput: TInput, originalInput: TInput],
    TInput | boolean
>

/**
 * Uses the retry strategy to create a function that can wrap any function with retry logic.
 *
 * ```
 * // As a simple example let's consider a function
 * // whose argument is the amount of money we want to pay for a service
 * const functionThatCanFail = (money: number): Promise<void> => { ... }
 *
 * // By default, it will use a three-times-and-fail retry strategy
 * const retry = createRetryFactory()
 *
 * // It can wrap any function (sync or async) that can throw or reject
 * const retriedFunctionThatCanFail = retry(functionThatCanFail)
 *
 * // The function can then be called just like the original, wrapped function
 * retriedFunctionThatCanFail(1_000_000)
 *
 * // For advanced cases, you can use your own strategy
 * const strategy: RetryStrategy<[money: number]> = () => { ... }
 * const retry = createRetryFactory(strategy)
 * ```
 *
 * @see {@link createSimpleRetryStrategy}
 * @see {@link RetryStrategy}
 *
 * @param {RetryStrategy<TInput>} [strategy] `RetryStrategy` to use. Defaults to a simple strategy that retries three times
 * @returns {<TOutput>(task: Factory<TInput, TOutput>) => Factory<TInput, TOutput>}
 */
export const createRetryFactory =
    <TInput extends unknown[]>(
        strategy: RetryStrategy<TInput> = createSimpleRetryStrategy(3)
    ): (<TOutput>(task: Factory<TInput, TOutput>) => Factory<TInput, TOutput>) =>
    <TOutput>(task: Factory<TInput, TOutput>): Factory<TInput, TOutput> =>
    async (...input) => {
        // We'll store the last used input in this variable
        let currentInput = input

        return backOff(async () => task(...currentInput), {
            // We'll effectively disable the numOfAttempts for exponential backoff
            // since we want the behavior to be completely controlled by the strategy
            numOfAttempts: Number.POSITIVE_INFINITY,
            // The retry callback is called after an unsuccessful attemp
            //
            // It allows us to decide whether we want to keep trying or give up
            // (we can give up by returning false)
            //
            // We'll use this callback to allow the strategy to effectively make changes
            // to the input, thus allowing it to accommodate for things such as gas price increase
            // for transactions
            async retry(error, attempt) {
                // We will evaluate the strategy first
                const strategyOutput = await strategy(attempt, error, currentInput, input)

                // The strategy can simply return true/false, in which case we'll not be adjusting the input at all
                if (typeof strategyOutput === 'boolean') {
                    return strategyOutput
                }

                // If we got an input back, we'll adjust it and keep trying
                return (currentInput = strategyOutput), true
            },
        })
    }

/**
 * Creates a simple `RetryStrategy` that will retry N times.
 *
 * If you want to compose this strategy, you can pass `wrappedStrategy`:
 *
 * ```
 * const myVeryAdvancedStrategy: RetryStrategy<[string, number]> = () => { ... }
 * const myVeryAdvancedStrategyThatWillRetryThreeTimesOnly = createSimpleRetryStrategy(3, myVeryAdvancedStrategy)
 * ```
 *
 * @param {number} numAttempts Must be larger than 0
 * @param {RetryStrategy<TInput>} [wrappedStrategy] Strategy to use if the number of attempts has not been reached yet
 * @returns {RetryStrategy<TInput>}
 */
export const createSimpleRetryStrategy = <TInput extends unknown[]>(
    numAttempts: number,
    wrappedStrategy?: RetryStrategy<TInput>
): RetryStrategy<TInput> => {
    assert(numAttempts > 0, `Number of attempts for a strategy must be larger than 0`)

    return (attempt, error, previousInput, originalInput) => {
        if (attempt > numAttempts) {
            return false
        }
        if (wrappedStrategy == null) {
            return true
        }

        return wrappedStrategy(attempt, error, previousInput, originalInput)
    }
}
