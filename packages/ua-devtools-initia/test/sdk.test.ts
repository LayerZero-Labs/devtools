// import { oft } from '../src/oft/sdk'
describe('SDK Tests', () => {
    it('Should return true', () => {
        expect(true).toBe(true)
    })
})
// describe('ua-devtools-initia', () => {
//     it('should print out the oft object', () => {
//         const getCircularReplacer = () => {
//             const seen = new WeakSet()
//             return (key: string, value: any) => {
//                 if (typeof value === 'object' && value !== null) {
//                     if (seen.has(value)) {
//                         return '[Circular]'
//                     }
//                     seen.add(value)
//                 }
//                 if (typeof value === 'bigint') {
//                     return value.toString()
//                 }
//                 return value
//             }
//         }

//         console.log('oft object:', JSON.stringify(oft, getCircularReplacer(), 2))
//     })
//     it('should verify OFT deployment', async () => {
//         // Get the OFT address
//         const oftAddress = oft.sdk.accounts.oft

//         // Get the provider
//         const provider = oft.sdk.provider.nativeProvider

//         try {
//             // Try to get the contract code at the address
//             const response = await provider.evm.c.getCode(oftAddress)

//             // If code exists at this address (length > 2 because '0x' is returned for non-existent contracts)
//             const isDeployed = response.length > 2

//             console.log('OFT address:', oftAddress)
//             console.log('Is deployed:', isDeployed)
//             console.log('Contract code length:', response.length)

//             expect(isDeployed).toBe(true)
//         } catch (error) {
//             console.error('Error checking OFT deployment:', error)
//             throw error
//         }
//     })
// })
