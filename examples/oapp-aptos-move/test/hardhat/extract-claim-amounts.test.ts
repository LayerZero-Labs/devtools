import * as fs from 'fs'
import * as path from 'path'

import { expect } from 'chai'

import { extractAndCalculate, writeValuesToJson } from '../../scripts/extract-claim-amounts'

describe('APT Calculation and JSON Writing', function () {
    let tempDir: string
    let csvFilePath: string
    let jsonFilePath: string

    before(async function () {
        tempDir = await fs.promises.mkdtemp('test-')
        csvFilePath = path.join(tempDir, 'test.csv')
        jsonFilePath = path.join(tempDir, 'claim-amounts.json')
    })

    after(async function () {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
    })

    describe('extractAndCalculate', function () {
        it('should calculate values correctly for valid CSV content', async function () {
            const csvContent = `destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,8915205.45,1.627086424
0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5,7399056.006,1.350378703`

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAndCalculate(fileContent)

            expect(result).to.deep.equal([
                56948024840, // 1.627086424 / 100 * 35000 * 100000000
                47263254605, // 1.350378703 / 100 * 35000 * 100000000
            ])
        })

        it('should handle empty CSV content gracefully', async function () {
            const csvContent =
                'destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct'

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAndCalculate(fileContent)

            expect(result).to.deep.equal([])
        })

        it('should handle duplicate rows correctly', async function () {
            const csvContent = `destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,8915205.45,1.627086424
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,8915205.45,1.627086424`

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAndCalculate(fileContent)

            expect(result).to.deep.equal([56948024840, 56948024840])
        })
    })

    describe('writeValuesToJson', function () {
        it('should write calculated values to a JSON file', async function () {
            const values = [569480248, 472632546]

            writeValuesToJson(values.map(String), jsonFilePath)

            const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8')
            const parsedValues = JSON.parse(fileContent)

            expect(parsedValues).to.deep.equal(['569480248', '472632546'])
        })

        it('should overwrite existing file with new values', async function () {
            const values1 = [569480248]
            const values2 = [472632546]

            writeValuesToJson(values1.map(String), jsonFilePath)
            writeValuesToJson(values2.map(String), jsonFilePath)

            const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8')
            const parsedValues = JSON.parse(fileContent)

            expect(parsedValues).to.deep.equal(['472632546'])
        })
    })
})
