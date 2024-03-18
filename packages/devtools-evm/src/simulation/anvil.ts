import { pipe } from 'fp-ts/lib/function'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'

export interface AnvilOptions {
    //
    // Server options
    //

    host?: string
    port?: number

    //
    // Account options
    //

    mnemonic?: string
    count?: number

    //
    // Forking options
    //

    forkUrl?: string

    //
    // EVM options
    //

    blockTime?: number

    //
    // State
    //

    state?: string
    stateInterval?: number
}

/**
 * Creates a list of CLI arguments for `anvil` command
 * to be used with e.g. `spawn` command
 *
 * @param {AnvilOptions} options
 * @returns {string[]} `anvil` CLI arguments
 */
export const createAnvilCliOptions = ({
    host,
    port,
    mnemonic,
    forkUrl,
    blockTime,
    count,
    state,
    stateInterval,
}: AnvilOptions): string[] =>
    pipe(
        [
            pipe(
                O.fromNullable(host),
                O.map((host) => ['--host', host])
            ),
            pipe(
                O.fromNullable(port),
                O.map((port) => ['--port', String(port)])
            ),
            pipe(
                O.fromNullable(mnemonic),
                O.map((mnemonic) => ['--mnemonic', mnemonic])
            ),
            pipe(
                O.fromNullable(count),
                O.map((count) => ['--count', String(count)])
            ),
            pipe(
                O.fromNullable(forkUrl),
                O.map((forkUrl) => ['--fork-url', forkUrl])
            ),
            pipe(
                O.fromNullable(blockTime),
                O.map((blockTime) => ['--block-time', String(blockTime)])
            ),
            pipe(
                O.fromNullable(state),
                O.map((state) => ['--state', state])
            ),
            pipe(
                O.fromNullable(stateInterval),
                O.map((stateInterval) => ['--state-interval', String(stateInterval)])
            ),
        ],
        A.compact,
        A.flatten
    )
