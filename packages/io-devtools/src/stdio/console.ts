/**
 * Executes the callback while mocking the console methods.
 * This will cause all the console output to be silenced.
 *
 * This method will return a promise resolved with the
 * resolved/returned value of the callback:
 *
 * ```
 * const result = await withMutedConsole(() => 7) // result === 7
 * const result = await withMutedConsole(async () => 7) // result === 7
 * ```
 *
 * @param {() => T | Promise<T>} callback
 */
export const withMutedConsole = async <T>(callback: () => T | Promise<T>): Promise<Awaited<T>> => {
    const originalLog = console.log
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalError = console.error
    const originalDebug = console.debug
    const noop = () => {}

    try {
        console.log = noop
        console.info = noop
        console.warn = noop
        console.error = noop
        console.debug = noop

        return await callback()
    } finally {
        console.log = originalLog
        console.info = originalInfo
        console.warn = originalWarn
        console.error = originalError
        console.debug = originalDebug
    }
}
