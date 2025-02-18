import type { Format } from 'logform'
import { createLogger as createWinstonLogger, format, transports, type Logger } from 'winston'
import { z } from 'zod'

/**
 * Re-export for ease of use
 */
export { type Logger } from 'winston'

/**
 * Valid logging levels
 */
export enum LogLevel {
    error = 'error',
    warn = 'warn',
    info = 'info',
    http = 'http',
    verbose = 'verbose',
    debug = 'debug',
    silly = 'silly',
}

const LogLevelSchema = z.nativeEnum(LogLevel)

/**
 * Type assertion utility for `LogLevel`
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export const isLogLevel = (value: unknown): value is LogLevel => LogLevelSchema.safeParse(value).success

let DEFAULT_LOG_LEVEL = LogLevel.info

/**
 * Sets the default log level used when creating new loggers.
 *
 * @param {string} level
 */
export const setDefaultLogLevel = (level: string) => {
    if (!isLogLevel(level)) {
        console.warn(
            `Invalid log level specified: ${level}. Ignoring and keeping the current value of ${DEFAULT_LOG_LEVEL}`
        )

        return
    }

    DEFAULT_LOG_LEVEL = level
}

/**
 * Creates a general-purpose logger
 *
 * @param level `LogLevel` Default to the globally set log level (@see `setDefaultLogLevel`)
 * @param logFormat `LogFormat` Optional Winston LogForm.Format instance
 *
 * @returns `Logger`
 */
export const createLogger = (level: string = DEFAULT_LOG_LEVEL, logFormat: Format = format.cli()): Logger =>
    createWinstonLogger({
        level,
        format: logFormat,
        transports: [new transports.Console()],
    })

/**
 * Creates a logger a module specific logging.
 *
 * The messages will be prefixed with the module name:
 *
 * `[module] Some message`
 *
 * @param {string} module
 * @param {string} [level] Default to the globally set log level (@see `setDefaultLogLevel`)
 *
 * @returns {Logger}
 */
export const createModuleLogger = (module: string, level: string = DEFAULT_LOG_LEVEL): Logger =>
    createLogger(level, format.combine(prefix({ label: module }), format.cli()))

/**
 * Creates a logger for network-to-network interactions.
 *
 * The messages will be prefixed with the network pair:
 *
 * `[ethereum-mainnet ➝ avalanche-mainnet] Some message`
 *
 * @param {string} sourceModule
 * @param {string} destinationModule
 * @param {string} [level] Default to the globally set log level (@see `setDefaultLogLevel`)
 *
 * @returns {Logger}
 */
export const createModuleInteractionLogger = (
    sourceModule: string,
    destinationModule: string,
    level: string = DEFAULT_LOG_LEVEL
): Logger =>
    createLogger(level, format.combine(prefix({ label: `${sourceModule} ➝ ${destinationModule}` }), format.cli()))

export interface CreateWithAsyncLoggerOptions<TArgs extends unknown[], TReturnValue> {
    onStart?: (logger: Logger, args: TArgs) => unknown
    onSuccess?: (logger: Logger, args: TArgs, returnValue: TReturnValue) => unknown
    onError?: (logger: Logger, args: TArgs, error: unknown) => unknown
}

/**
 * Helper higher order function for creating wrappers that log
 * execution of async functions.
 *
 * ```
 * const myAsyncFunction = async (name: string): Promise<number> => 6;
 *
 * // We can go with the default logger
 * const withAsyncLogger = createWithAsyncLogger()
 *
 * // Or supply our own
 * const withAsyncLogger = createWithAsyncLogger(() => createModuleLogger('my-module'))
 *
 * const myAsyncFunctionWithLogging = withAsyncLogger(myAsyncFunction, {
 *   onStart: (logger, [name]) => logger.info(`Starting myAsyncFunction with argument ${name}`)
 *   onSuccess: (logger, [name], retrurnValue) => logger.info(`Finished myAsyncFunction with argument ${name}, will return ${returnValue}`)
 *   onError: (logger, [name], error) => logger.info(`myAsyncFunction errored out with argument ${name}: ${error}`)
 * })
 *
 * // The wrapper function has the same signature as the wrapped function
 * await myAsyncFunctionWithLogging('Boris')
 * ```
 *
 * @param {() => Logger} [loggerFactory] Function that returns a `Logger` instance
 * @returns
 */
export const createWithAsyncLogger =
    (loggerFactory: () => Logger = createLogger) =>
    <TArgs extends unknown[], TReturnValue>(
        fn: (...args: TArgs) => Promise<TReturnValue>,
        { onStart, onSuccess, onError }: CreateWithAsyncLoggerOptions<TArgs, TReturnValue> = {}
    ) => {
        // We'll create the logger only when needed
        let logger: Logger

        return async (...args: TArgs): Promise<TReturnValue> => {
            // If we don't have a logger yet, now is a great time to make one
            logger = logger ?? loggerFactory()

            // Let the consumer know that the execution has started
            onStart?.(logger, args)

            // Now try executing the actual function
            try {
                // In the happy case, the function gives us a return value back
                const returnValue = await fn(...args)

                // We try logging the return value
                try {
                    onSuccess?.(logger, args, returnValue)
                } catch {
                    // If the logger errors out, we ignore it
                }

                // And we return it
                return returnValue
            } catch (error) {
                // In the unhappy, saddening and most disappointing case the function errors out

                // We try logging the error
                try {
                    onError?.(logger, args, error)
                } catch {
                    // If the logger errors out, we ignore it
                }

                // And we rethrow
                throw error
            }
        }
    }

/**
 * Helper utility that prefixes logged messages
 * with label (wrapped in square brackets)
 *
 * An example of logged message with `ethereum-mainnet` label:
 *
 * `[ethereum-mainnet] Some message`
 */
const prefix = format((info, { label }) => ({
    ...info,
    message: `${label ? `[${label}] ` : ''}${info.message}`,
}))
