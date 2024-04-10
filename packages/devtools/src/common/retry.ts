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
    enabled?: boolean
    /**
     * The maximum delay, in milliseconds, between two consecutive attempts.
     *
     * @default Infinity
     */
    maxDelay?: number
    /**
     * Number of time the method call will be retried. The default is 3
     *
     * @default 3
     */
    numAttempts?: number
    /**
     * Callback called on every failed attempt.
     *
     * @param {number} attempt
     * @param {unknown} error
     * @param {this} target
     * @returns {boolean | undefined} This function can stop the retry train by returning false
     */
    onRetry?: OnRetry<TInstance>
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

export const AsyncRetriable = ({
    // We'll feature flag this functionality for the time being
    enabled = !!process.env.LZ_EXPERIMENTAL_ENABLE_RETRY,
    maxDelay,
    numAttempts = 3,
    onRetry = createDefaultRetryHandler(),
}: RetriableConfig = {}) => {
    return function AsyncRetriableDecorator<TArgs extends unknown[], TResult>(
        target: unknown,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: TArgs) => Promise<TResult>>
    ) {
        // If we are disabled, we are disabled
        if (!enabled) {
            return descriptor
        }

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
            (error: unknown, attempt: number): boolean =>
                onRetry?.(attempt, numAttempts, error, target, propertyKey, args) ?? true

        // Create the retried method
        const retriedMethod = (...args: TArgs): Promise<TResult> =>
            backOff(() => originalMethod.apply(target, args), {
                // A typical problem in our case is 429 Too many requests
                // which would still happen if we didn't introduce a bit of randomness into the delay
                jitter: 'full',
                maxDelay,
                numOfAttempts: numAttempts,
                retry: handleRetry(args),
            })

        // return our new descriptor
        return (descriptor.value = retriedMethod), descriptor
    }
}
