import { beforeEach, describe, expect, test, jest } from '@jest/globals'
import { EventEmitter } from 'events'

import { getInitiaBech32, getInitiaDeployerAddress, getInitiaSequenceNumber } from '../tasks/move/utils/config'

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

async function waitForSpawnCount(processes: MockProcess[], count: number): Promise<void> {
    while (processes.length < count) {
        await new Promise((resolve) => setImmediate(resolve))
    }
}

describe('Initia address derivation helpers', () => {
    beforeEach(() => {
        ;(spawn as jest.Mock).mockReset()
    })

    test('getInitiaBech32 returns first bech32 format', async () => {
        const proc = createMockProcess()
        ;(spawn as jest.Mock).mockReturnValue(proc)

        const promise = getInitiaBech32('initiad', '0x' + '11'.repeat(32))

        proc.stdout.emit('data', JSON.stringify({ formats: ['init1abc', 'init1def'] }))
        proc.emit('close', 0)

        await expect(promise).resolves.toBe('init1abc')
    })

    test('getInitiaSequenceNumber adds offset', async () => {
        const proc = createMockProcess()
        ;(spawn as jest.Mock).mockReturnValue(proc)

        const promise = getInitiaSequenceNumber('initiad', 'init1abc', 'https://rpc.initia.xyz')

        proc.stdout.emit('data', JSON.stringify({ info: { sequence: '7' } }))
        proc.emit('close', 0)

        await expect(promise).resolves.toBe(BigInt(9))
    })

    test('getInitiaDeployerAddress derives address from inputs', async () => {
        const processes: MockProcess[] = []
        ;(spawn as jest.Mock).mockImplementation(() => {
            const proc = createMockProcess()
            processes.push(proc)
            return proc
        })

        const originalRpcUrl = process.env.INITIA_RPC_URL
        process.env.INITIA_RPC_URL = 'https://rpc.initia.xyz'

        const hexAddr = '0x' + '11'.repeat(32)
        const promise = getInitiaDeployerAddress(hexAddr)

        await waitForSpawnCount(processes, 1)
        processes[0].stdout.emit('data', JSON.stringify({ formats: ['init1abc'] }))
        processes[0].emit('close', 0)

        await waitForSpawnCount(processes, 2)
        processes[1].stdout.emit('data', JSON.stringify({ info: { sequence: '7' } }))
        processes[1].emit('close', 0)

        await waitForSpawnCount(processes, 3)
        processes[2].stdout.emit(
            'data',
            JSON.stringify({
                resource: {
                    move_resource: JSON.stringify({ data: { count: '3' } }),
                },
            })
        )
        processes[2].emit('close', 0)

        await expect(promise).resolves.toBe('0xd7ef90d4a7043432efaa7dca1c7e875b2f420542caf800354457eeaee0cfa68c')

        process.env.INITIA_RPC_URL = originalRpcUrl
    })
})
