import assert from 'assert'

import { Program, ProgramError } from '@metaplex-foundation/umi'

import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

export async function expectOftError<T extends ProgramError>(
    operation: () => Promise<unknown>,
    expectedErrorClass: new (...args: unknown[]) => T,
    program: Program,
    customMessage?: string
): Promise<void> {
    let caught: unknown
    try {
        await operation()
    } catch (error: unknown) {
        caught = error
    }
    if (caught === undefined) {
        assert.fail(`Expected ${expectedErrorClass.name} to be thrown, but operation succeeded`)
    }
    const errorMessage = customMessage || `Expected ${expectedErrorClass.name}`
    assertOftError(caught, expectedErrorClass, program, errorMessage)
}

export function assertOftError<T extends ProgramError>(
    error: unknown,
    expectedErrorClass: new (...args: unknown[]) => T,
    program: Program,
    message: string
): void {
    const isMatch = isOftError(error, expectedErrorClass, program)

    if (!isMatch) {
        const actualInfo = getErrorInfo(error)
        assert.fail(`${message}, but got: ${actualInfo}\nExpected: ${expectedErrorClass.name}`)
    }
}

function isOftError<T extends ProgramError>(
    error: unknown,
    expectedErrorClass: new (...args: unknown[]) => T,
    program: Program
): boolean {
    const instance = new expectedErrorClass(program)
    if (!('code' in instance) || typeof instance.code !== 'number') {
        return false
    }
    const expectedMessage = `Error Code: ${instance.name}. Error Number: ${instance.code.toString(10)}`

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.startsWith('Simulate Fail:')
    ) {
        const msg = error.message.split('Simulate Fail:')[1]
        return JSON.stringify(msg).includes(expectedMessage)
    }

    if (
        typeof error !== 'object' ||
        error === null ||
        !('transactionError' in error) ||
        error.transactionError == null ||
        typeof error.transactionError !== 'object' ||
        !('logs' in error.transactionError)
    ) {
        return false
    }

    const logs = error.transactionError.logs
    return JSON.stringify(logs).includes(expectedMessage)
}

function getErrorInfo(error: unknown): string {
    const err = error as { message?: string; code?: string; name?: string; logs?: string[] }
    const parts = []

    if (err.message) {
        parts.push(`Message: "${err.message}"`)
    }

    if (err.code) {
        parts.push(`Code: ${err.code}`)
    }

    if (err.name) {
        parts.push(`Name: ${err.name}`)
    }

    if (err.logs) {
        const errorLogs = err.logs.filter((log: string) => log.includes('Error Code:') || log.includes('Error Number:'))
        if (errorLogs.length > 0) {
            parts.push(`Logs: [${errorLogs.slice(0, 2).join(', ')}]`)
        }
    }

    return parts.length > 0 ? parts.join(', ') : 'Unknown error format'
}

export const OftErrors = oft.errors
