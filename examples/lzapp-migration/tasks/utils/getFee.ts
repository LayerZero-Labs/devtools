import { Connection, PublicKey } from '@solana/web3.js'

// TODO: merge this into tasks/solana/utils

// Define interfaces for more explicit typing
interface PrioritizationFeeObject {
    slot: number
    prioritizationFee: number
}

interface Config {
    lockedWritableAccounts: PublicKey[]
}

const getPrioritizationFees = async (
    connection: Connection,
    programId?: string // TODO: change to array of addresses / public keys to match lockedWritableAccounts' type
): Promise<{
    averageFeeIncludingZeros: number
    averageFeeExcludingZeros: number
    medianFee: number
}> => {
    try {
        const publicKey = new PublicKey(programId || PublicKey.default) // the account that will be written to

        const config: Config = {
            lockedWritableAccounts: [publicKey],
        }

        const prioritizationFeeObjects = (await connection.getRecentPrioritizationFees(
            config
        )) as PrioritizationFeeObject[]

        if (prioritizationFeeObjects.length === 0) {
            console.log('No prioritization fee data available.')
            return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
        }

        // Extract slots and sort them
        // const slots = prioritizationFeeObjects.map((feeObject) => feeObject.slot).sort((a, b) => a - b)

        // Calculate the average including zero fees
        const averageFeeIncludingZeros =
            prioritizationFeeObjects.length > 0
                ? Math.floor(
                      prioritizationFeeObjects.reduce((acc, feeObject) => acc + feeObject.prioritizationFee, 0) /
                          prioritizationFeeObjects.length
                  )
                : 0

        // Filter out prioritization fees that are equal to 0 for other calculations
        const nonZeroFees = prioritizationFeeObjects
            .map((feeObject) => feeObject.prioritizationFee)
            .filter((fee) => fee !== 0)

        // Calculate the average of the non-zero fees
        const averageFeeExcludingZeros =
            nonZeroFees.length > 0 ? Math.floor(nonZeroFees.reduce((acc, fee) => acc + fee, 0) / nonZeroFees.length) : 0

        // Calculate the median of the non-zero fees
        const sortedFees = nonZeroFees.sort((a, b) => a - b)
        let medianFee = 0
        if (sortedFees.length > 0) {
            const midIndex = Math.floor(sortedFees.length / 2)
            medianFee =
                sortedFees.length % 2 !== 0
                    ? sortedFees[midIndex]
                    : Math.floor((sortedFees[midIndex - 1] + sortedFees[midIndex]) / 2)
        }
        return { averageFeeIncludingZeros, averageFeeExcludingZeros, medianFee }
    } catch (error) {
        console.error('Error fetching prioritization fees:', error)
        return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
    }
}

export default getPrioritizationFees
