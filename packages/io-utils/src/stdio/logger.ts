import { createLogger as createWinstonLogger, format, transports, Logger } from 'winston'

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

/**
 * Type assertion utility for LogLevel
 *
 * @param value `unknown`
 * @returns `value is LogLevel`
 */
const isLogLevel = (value: unknown): value is LogLevel => typeof value === 'string' && value in LogLevel

let DEFAULT_LOG_LEVEL = LogLevel.info

/**
 * Sets the default log level used when creating new loggers.
 *
 * @param level `LogLevel`
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
export const createLogger = (level: string = DEFAULT_LOG_LEVEL, logFormat = format.cli()) =>
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
