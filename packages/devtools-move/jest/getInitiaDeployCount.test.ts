import { describe, expect, test, jest, beforeEach } from '@jest/globals'
import { EventEmitter } from 'events'

import { getInitiaDeployCount } from '../tasks/move/utils/config'

jest.mock('child_process', () => ({
    spawn: jest.fn(),
}))

import { spawn } from 'child_process'

type MockProcess = EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
}

function createMockProcess(): MockProcess {
    const proc = new EventEmitter() as MockProcess
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    return proc
}

describe('getInitiaDeployCount', () => {
    beforeEach(() => {
        ;(spawn as jest.Mock).mockReset()
    })

    test('returns 0 when output contains not found', async () => {
        const proc = createMockProcess()
        ;(spawn as jest.Mock).mockReturnValue(proc)

        const promise = getInitiaDeployCount(
            'initiad',
            'init1vtqp5z9rfxsaz2qfl9mhs002t4qma3uqa8yyyw',
            'https://rpc.initia.xyz'
        )

        proc.stderr.emit('data', 'collections: not found: key')
        proc.emit('close', 1)

        await expect(promise).resolves.toBe(BigInt(0))
    })
})
