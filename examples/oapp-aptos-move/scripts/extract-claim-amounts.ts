import * as fs from 'fs'
import * as path from 'path'

import * as csv from 'csv-parse/sync'

// Function to read CSV, extract values, and calculate new values
export function extractAndCalculate(fileContent: string): string[] {
    // Parse the CSV content
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
    })

    // Extract and calculate new values
    const calculatedValues = records.map((record: any) => {
        const pctValue = parseFloat(record.tranferred_volume_share_to_aptos_chain_by_this_address_pct)
        const calculatedValue = (pctValue / 100) * 35000

        // Represent the calculated value in full decimals for APT
        const aptValue = Math.round(calculatedValue * 100000000) // Multiply by 100000000 and round to ensure it's an integer
        return aptValue
    })

    return calculatedValues
}

// Function to write calculated values to JSON file
export function writeValuesToJson(values: string[], outputPath: string): void {
    const jsonContent = JSON.stringify(values, null, 2)
    fs.writeFileSync(outputPath, jsonContent)
    console.log(`Calculated values written to ${outputPath}`)
}

// Main execution
const csvFilePath = path.join(__dirname, 'aptos-rewards.csv')
const jsonOutputPath = path.join(__dirname, 'claim-amounts.json')

try {
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8')
    const calculatedValues = extractAndCalculate(fileContent)
    writeValuesToJson(calculatedValues, jsonOutputPath)
} catch (error) {
    console.error('Error processing the file:', error)
}
