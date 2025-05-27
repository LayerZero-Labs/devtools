import { Connection, PublicKey } from '@solana/web3.js'

/**
 * Returns recent prioritization fees for transactions writing to a given
 * account, along with some simple statistics.
 *
 * If no `programId` is provided, a zeroed public key is used instead.
 */
export const getPrioritizationFees = async (
    connection: Connection,
    programId?: string
): Promise<{
    averageFeeIncludingZeros: number
    averageFeeExcludingZeros: number
    medianFee: number
}> => {
    try {
        const publicKey = new PublicKey(programId || PublicKey.default)
        const config = {
            lockedWritableAccounts: [publicKey],
        }
        const prioritizationFeeObjects = (await connection.getRecentPrioritizationFees(config)) as {
            slot: number
            prioritizationFee: number
        }[]
        if (prioritizationFeeObjects.length === 0) {
            return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
        }
        const averageFeeIncludingZeros = Math.floor(
            prioritizationFeeObjects.reduce((acc, f) => acc + f.prioritizationFee, 0) / prioritizationFeeObjects.length
        )
        const nonZeroFees = prioritizationFeeObjects.map((f) => f.prioritizationFee).filter((fee) => fee !== 0)
        const averageFeeExcludingZeros =
            nonZeroFees.length > 0 ? Math.floor(nonZeroFees.reduce((a, b) => a + b, 0) / nonZeroFees.length) : 0
        const sortedFees = nonZeroFees.sort((a, b) => a - b)
        let medianFee = 0
        if (sortedFees.length > 0) {
            const mid = Math.floor(sortedFees.length / 2)
            medianFee =
                sortedFees.length % 2 ? sortedFees[mid] : Math.floor((sortedFees[mid - 1] + sortedFees[mid]) / 2)
        }
        return { averageFeeIncludingZeros, averageFeeExcludingZeros, medianFee }
    } catch {
        return { averageFeeIncludingZeros: 0, averageFeeExcludingZeros: 0, medianFee: 0 }
    }
}
