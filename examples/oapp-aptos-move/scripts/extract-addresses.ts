// extractAddresses.ts
import * as fs from 'fs'

import * as csv from 'csv-parse/sync'

export function extractAddresses(fileContent: string): string[] {
    try {
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
        })

        return records.map((record: any) => record.destination_address_on_aptos_chain)
    } catch (error) {
        throw new Error(`Malformed CSV content: ${error}`)
    }
}

export function writeAddressesToJson(addresses: string[], outputPath: string): void {
    const jsonContent = JSON.stringify(addresses, null, 2)
    fs.writeFileSync(outputPath, jsonContent)
}

if (require.main === module) {
    const csvFilePath = './aptos-rewards.csv'
    const jsonOutputPath = './addresses.json'

    const fileContent = fs.readFileSync(csvFilePath, 'utf-8')
    const addresses = extractAddresses(fileContent)
    writeAddressesToJson(addresses, jsonOutputPath)
    console.log(`Addresses written to ${jsonOutputPath}`)
}
