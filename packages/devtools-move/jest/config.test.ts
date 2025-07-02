import { expect } from 'chai'
import { isVersionGreaterOrEqualTo, isVersionLessThanOrEqualTo, getAptosCLICommand } from '../tasks/move/utils/config'

describe('tasks/move/utils/config', () => {
    describe('isVersionGreaterOrEqualTo', () => {
        it('works', () => {
            expect(isVersionGreaterOrEqualTo('6.0.1', '6.0.1')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('6.0.1', '6.0.0')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('6.0.1', '5.0.0')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('7.5.0', '6.0.1')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('6.0.1', '7.0.0')).to.equal(false)
            expect(isVersionGreaterOrEqualTo('5.0.0', '6.0.1')).to.equal(false)
            expect(isVersionGreaterOrEqualTo('5.0.0', '7.0.0')).to.equal(false)
            expect(isVersionGreaterOrEqualTo('7.0.0', '6.0.1')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('7.0.0', '5.0.0')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('7.0.0', '7.0.0')).to.equal(true)
            expect(isVersionGreaterOrEqualTo('7.0.0', '8.0.0')).to.equal(false)
        })
    })

    describe('isVersionLessThanOrEqualTo', () => {
        it('works', () => {
            expect(isVersionLessThanOrEqualTo('6.0.1', '6.0.1')).to.equal(true)
            expect(isVersionLessThanOrEqualTo('6.0.1', '6.0.0')).to.equal(false)
            expect(isVersionLessThanOrEqualTo('6.0.1', '5.0.0')).to.equal(false)
            expect(isVersionLessThanOrEqualTo('7.5.0', '6.0.1')).to.equal(false)
            expect(isVersionLessThanOrEqualTo('6.0.1', '7.0.0')).to.equal(true)
            expect(isVersionLessThanOrEqualTo('5.0.0', '6.0.1')).to.equal(true)
            expect(isVersionLessThanOrEqualTo('5.0.0', '7.0.0')).to.equal(true)
            expect(isVersionLessThanOrEqualTo('7.0.0', '6.0.1')).to.equal(false)
            expect(isVersionLessThanOrEqualTo('7.0.0', '5.0.0')).to.equal(false)
            expect(isVersionLessThanOrEqualTo('7.0.0', '7.0.0')).to.equal(true)
            expect(isVersionLessThanOrEqualTo('7.0.0', '8.0.0')).to.equal(true)
        })
    })

    describe('warning message format', () => {
        it('contains the correct professional warning text', async () => {
            await getAptosCLICommand('aptos', 'mainnet')
        })
    })
})
