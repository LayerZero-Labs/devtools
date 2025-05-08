import * as fs from 'fs'
import * as path from 'path'

import { expect } from 'chai'

import { extractAddresses, writeAddressesToJson } from '../../scripts/extract-addresses'

describe('Address Extraction and JSON Writing', function () {
    let tempDir: string
    let csvFilePath: string
    let jsonFilePath: string

    before(async function () {
        tempDir = await fs.promises.mkdtemp('test-')
        csvFilePath = path.join(tempDir, 'test.csv')
        jsonFilePath = path.join(tempDir, 'addresses.json')
    })

    after(async function () {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
    })

    describe('extractAddresses', function () {
        it('should extract addresses from valid CSV content', async function () {
            const csvContent = `destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,8915205.45,1.627086424
0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5,7399056.006,1.350378703`

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAddresses(fileContent)

            expect(result).to.deep.equal([
                '0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572',
                '0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5',
            ])
        })

        it('should handle duplicate addresses', async function () {
            const csvContent = `destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,8915205.45,1.627086424
0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572,7399056.006,1.350378703`

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAddresses(fileContent)

            expect(result).to.deep.equal([
                '0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572',
                '0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572',
            ])
        })

        it('should return an empty array for empty CSV content', async function () {
            const csvContent =
                'destination_address_on_aptos_chain,transferred_volume_to_aptos_chain_by_this_address,tranferred_volume_share_to_aptos_chain_by_this_address_pct'

            await fs.promises.writeFile(csvFilePath, csvContent)
            const fileContent = await fs.promises.readFile(csvFilePath, 'utf-8')
            const result = extractAddresses(fileContent)

            expect(result).to.deep.equal([])
        })
    })

    describe('writeAddressesToJson', function () {
        it('should write addresses to a JSON file', async function () {
            const addresses = [
                '0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572',
                '0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5',
            ]

            writeAddressesToJson(addresses, jsonFilePath)

            const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8')
            const parsedAddresses = JSON.parse(fileContent)

            expect(parsedAddresses).to.deep.equal(addresses)
        })

        it('should overwrite existing file', async function () {
            const addresses1 = ['0xcfc7ef2c324f5d57e199e316c728734faf0c24e771fb031e3b146842d6c14572']
            const addresses2 = ['0xaab5c469f7f827337d80fb63fe89235f484a252898dc34931096e3c480f4adf5']

            writeAddressesToJson(addresses1, jsonFilePath)
            writeAddressesToJson(addresses2, jsonFilePath)

            const fileContent = await fs.promises.readFile(jsonFilePath, 'utf-8')
            const parsedAddresses = JSON.parse(fileContent)

            expect(parsedAddresses).to.deep.equal(addresses2)
        })
    })
})
