import assert from 'assert'

/**
 * Simple async retry functionality
 *
 * The onretry callback is async and will be awaited which allows for
 * custom timeout functionality
 */
export const retry = async <TResult>(
    callback: () => Promise<TResult>,
    numAttempts: number,
    onRetry?: (error: unknown, attempt: number) => unknown
): Promise<TResult> => {
    assert(numAttempts > 0, `Number of attempts for retry must be larger than 0, got ${numAttempts}`)

    // We'll try/catch the first N - 1 attempts, invoking onRetry after every failed attempt
    for (let attempt = 0; attempt < numAttempts - 1; attempt++) {
        try {
            return await callback()
        } catch (error) {
            await onRetry?.(error, attempt)
        }
    }

    // The last attempt we don't try/catch and let the error propagate to the user
    return callback()
}
