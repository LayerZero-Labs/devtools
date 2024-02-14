import { readFileSyncSafe, mkdirSafe } from './fs'
import * as E from 'fp-ts/Either'
import { readFileSync, mkdirSync } from 'fs'

jest.mock('fs')

describe('common/fs', () => {
    describe('readFileSyncSafe()', () => {
        const readFileSyncMock = readFileSync as jest.Mock

        it('should return a left either wrapped in error if readFileSync fails', () => {
            readFileSyncMock.mockImplementation(() => {
                throw 'borken'
            })

            expect(readFileSyncSafe('filename')).toEqual(E.left(new Error('borken')))
        })

        it('should return a right either with utf8 contents if readFileSync succeeds', () => {
            readFileSyncMock.mockReturnValue('contents')

            expect(readFileSyncSafe('filename')).toEqual(E.right('contents'))
        })
    })

    describe('mkdirSafe()', () => {
        const mkdirSyncMock = mkdirSync as jest.Mock

        it('should return a left either if mkdirSync fails', () => {
            mkdirSyncMock.mockImplementation(() => {
                throw 'borken'
            })

            expect(mkdirSafe('some/dir/name')).toEqual(E.left(new Error('borken')))
        })

        it('should return a right either with the path if mkdirSync returns undefined', () => {
            mkdirSyncMock.mockReturnValue(undefined)

            expect(mkdirSafe('some/dir/name')).toEqual(E.right('some/dir/name'))
        })

        it('should return a right either with the path if mkdirSync returns a string', () => {
            mkdirSyncMock.mockReturnValue('some/dir')

            expect(mkdirSafe('some/dir/name')).toEqual(E.right('some/dir/name'))
        })
    })
})
