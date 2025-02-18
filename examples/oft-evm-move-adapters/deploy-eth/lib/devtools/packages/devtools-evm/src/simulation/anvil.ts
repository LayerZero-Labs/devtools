import { identity, pipe } from 'fp-ts/lib/function'
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
    derivationPath?: string

    //
    // Forking options
    //

    forkUrl?: string
    forkBlockNumber?: number
    retries?: number
    timeout?: number

    //
    // EVM options
    //

    blockTime?: number

    //
    // State
    //

    state?: string
    stateInterval?: number

    //
    // History
    //

    pruneHistory?: boolean
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
    forkBlockNumber,
    retries,
    timeout,
    blockTime,
    count,
    derivationPath,
    state,
    stateInterval,
    pruneHistory,
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
                O.fromNullable(derivationPath),
                O.map((derivationPath) => ['--derivation-path', derivationPath])
            ),
            pipe(
                O.fromNullable(forkUrl),
                O.map((forkUrl) => ['--fork-url', forkUrl])
            ),
            pipe(
                O.fromNullable(forkBlockNumber),
                O.map((forkBlockNumber) => ['--fork-block-number', String(forkBlockNumber)])
            ),
            pipe(
                O.fromNullable(retries),
                O.map((retries) => ['--retries', String(retries)])
            ),
            pipe(
                O.fromNullable(timeout),
                O.map((timeout) => ['--timeout', String(timeout)])
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
            pipe(
                O.fromNullable(pruneHistory),
                O.filter(identity),
                O.map(() => ['--prune-history'])
            ),
        ],
        A.compact,
        A.flatten
    )
