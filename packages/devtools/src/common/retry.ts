import assert from 'assert'
import { backOff } from 'exponential-backoff'

export interface RetriableConfig<TInstance = unknown> {
    numAttempts?: number
    onRetry?: (attempt: number, error: unknown, target: TInstance) => boolean | void | undefined
}

export const AsyncRetriable = ({ numAttempts = 3, onRetry }: RetriableConfig = {}) => {
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
        const handleRetry = (error: unknown, attempt: number): boolean => onRetry?.(attempt, error, target) ?? true

        // Create the retried method
        const retriedMethod = (...args: TArgs): Promise<TResult> =>
            backOff(() => originalMethod.apply(target, args), { numOfAttempts: numAttempts, retry: handleRetry })

        // return our new descriptor
        return (descriptor.value = retriedMethod), descriptor
    }
}
