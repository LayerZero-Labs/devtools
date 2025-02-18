import { createModuleLogger, printJson } from '@layerzerolabs/io-devtools'
import assert from 'assert'
import { backOff } from 'exponential-backoff'

export type OnRetry<TInstance, TArgs extends unknown[] = unknown[]> = (
    attempt: number,
    numAttempts: number,
    error: unknown,
    target: TInstance,
    method: string,
    args: TArgs
) => boolean | void | undefined

export interface RetriableConfig<TInstance = unknown> {
    /**
     * Enable / disable the retry behavior
     */
    enabled: boolean
    /**
     * The maximum delay, in milliseconds, between two consecutive attempts.
     *
     * @default Infinity
     */
    maxDelay?: number
    /**
     * Number of times the method call will be retried. The default is 3
     *
     * @default 3
     */
    numAttempts: number
    /**
     * Callback called on every failed attempt.
     *
     * @param {number} attempt 1-indexed number of attempt of executing the method
     * @param {number} numAttempts Maximum/total number of attempts that will be executed
     * @param {unknown} error The error that caused the function to be retried
     * @param {unknown} target The object whose method is being retried
     * @param {string} method The method name
     * @param {unknown[]} args The method parameters
     * @returns {boolean | undefined} This function can stop the retry train by returning false
     */
    onRetry: OnRetry<TInstance>
}

interface TAsyncRetriable {
    <TArgs extends unknown[], TResult>(
        overrides?: Partial<RetriableConfig>
    ): (
        target: unknown,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<TResult>>
    ) => TypedPropertyDescriptor<(...args: TArgs) => Promise<TResult>>

    /**
     * The default config used by all Asyncretriable decorators.
     *
     * This config can be updated at runtime by setting its properties:
     *
     * ```
     * AsyncRetriable.config.numAttempts = 10
     * ```
     */
    config: RetriableConfig

    /**
     * Resets the config to its default state
     *
     * @returns {void}
     */
    reset: () => void
}

/**
 * Helper function that creates a default debug logger for the `onRetry`
 * callback of `AsyncRetriable`
 */
export const createDefaultRetryHandler = (loggerName: string = 'AsyncRetriable'): OnRetry<unknown> => {
    const logger = createModuleLogger(loggerName)

    return (attempt, numAttempts, error, target, method, args) => {
        logger.debug(`Attempt ${attempt}/${numAttempts}: ${method}() with arguments: ${printJson(args)}: ${error}`)
    }
}

export const AsyncRetriable: TAsyncRetriable = (overrides: Partial<RetriableConfig> = {}) => {
    return function AsyncRetriableDecorator<TArgs extends unknown[], TResult>(
        target: unknown,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<TResult>>
    ) {
        // Grab the original method and ensure that we are decorating a method
        const originalMethod = descriptor.value
        assert(
            typeof originalMethod === 'function',
            `AsyncRetriable must be applied to an instance method, ${propertyKey} property looks more like ${typeof originalMethod}`
        )

        // We'll wrap the retry handler from exponential backoff
        // to make it a bit nicer to use
        //
        // - We'll put the attempt as the first argument
        // - We'll add the decorator target as the last argument
        //
        // We'll curry this function so that it can pass the arguments to onRetry
        const handleRetry =
            (args: TArgs) =>
            (error: unknown, attempt: number): boolean => {
                const numAttempts = overrides.numAttempts ?? AsyncRetriable.config.numAttempts
                const onRetry = overrides.onRetry ?? AsyncRetriable.config.onRetry

                return onRetry(attempt, numAttempts, error, target, propertyKey, args) ?? true
            }

        // Create the retried method
        const retriedMethod = function (this: unknown, ...args: TArgs): Promise<TResult> {
            const enabled = overrides.enabled ?? AsyncRetriable.config.enabled
            // If we are disabled, we are disabled
            if (!enabled) {
                return originalMethod.apply(this, args)
            }

            const maxDelay = overrides.numAttempts ?? AsyncRetriable.config.maxDelay
            const numAttempts = overrides.numAttempts ?? AsyncRetriable.config.numAttempts

            // We need to call the original method with the current this context
            // rather than the target, target can point to a prototype rather than the instance
            return backOff(() => originalMethod.apply(this, args), {
                // A typical problem in our case is 429 Too many requests
                // which would still happen if we didn't introduce a bit of randomness into the delay
                jitter: 'full',
                maxDelay,
                numOfAttempts: numAttempts,
                retry: handleRetry(args),
            })
        }

        // return our new descriptor
        return (descriptor.value = retriedMethod), descriptor
    }
}

const DEFAULT_CONFIG: RetriableConfig = {
    enabled: true,
    numAttempts: 3,
    onRetry: createDefaultRetryHandler(),
}

/**
 * The default config used by all Asyncretriable decorators.
 *
 * This config can be updated at runtime by setting its properties:
 *
 * ```
 * AsyncRetriable.config.numAttempts = 10
 * ```
 */
AsyncRetriable.config = { ...DEFAULT_CONFIG }

/**
 * Resets the config to its default state
 *
 * @returns {void}
 */
AsyncRetriable.reset = () => {
    AsyncRetriable.config = { ...DEFAULT_CONFIG }
}
