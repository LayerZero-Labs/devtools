import * as fs from 'fs'

import { expect } from 'chai'
import sinon from 'sinon'

import { generateAndRunFunctionJson } from '../../scripts/send-txs'

describe('generateAndRunFunctionJson', function () {
    let addressesFile: string
    let outputFile: string
    let functionJsonFile: string
    let execStub: sinon.SinonStub

    before(async function () {
        addressesFile = './addresses.json'
        outputFile = './output.json'
        functionJsonFile = './function.json'
    })

    beforeEach(function () {
        execStub = sinon
            .stub(require('child_process'), 'exec')
            .callsFake((cmd, cb: any) => cb(null, { stdout: '', stderr: '' }))
    })

    afterEach(function () {
        sinon.restore()
    })

    it('should generate correct function JSON for exact batch size', async function () {
        const addresses = Array(250).fill('0xabc123')
        const amounts = Array(250).fill(1000)

        await fs.promises.writeFile(addressesFile, JSON.stringify(addresses))
        await fs.promises.writeFile(outputFile, JSON.stringify(amounts))

        await generateAndRunFunctionJson()

        const functionJson = JSON.parse(await fs.promises.readFile(functionJsonFile, 'utf-8'))

        expect(functionJson.args[0].value.length).to.equal(250)
        expect(functionJson.args[1].value.length).to.equal(250)
    })

    it('should handle one more than batch size correctly', async function () {
        const addresses = Array(251).fill('0xabc123')
        const amounts = Array(251).fill(1000)

        await fs.promises.writeFile(addressesFile, JSON.stringify(addresses))
        await fs.promises.writeFile(outputFile, JSON.stringify(amounts))

        await generateAndRunFunctionJson()

        const functionJson = JSON.parse(await fs.promises.readFile(functionJsonFile, 'utf-8'))
        expect(functionJson.args[0].value.length).to.equal(1) // Last batch with one address
        expect(functionJson.args[1].value.length).to.equal(1)
    })

    it('should throw error on mismatched lengths', async function () {
        const addresses = Array(10).fill('0xabc123')
        const amounts = Array(9).fill(1000) // One less than addresses

        await fs.promises.writeFile(addressesFile, JSON.stringify(addresses))
        await fs.promises.writeFile(outputFile, JSON.stringify(amounts))

        try {
            await generateAndRunFunctionJson()
            throw new Error('Test failed: expected an error due to mismatched lengths')
        } catch (error: any) {
            expect(error.message).to.include('Mismatch in addresses and claim amounts length')
        }
    })
})
