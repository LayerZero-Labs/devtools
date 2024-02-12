import { encodeContructorArguments } from '@/common/abi'

describe('abi', () => {
    describe('encodeContructorArguments', () => {
        it('should return undefined if args are nullish', () => {
            expect(encodeContructorArguments([], undefined)).toBeUndefined()
        })

        it('should return undefined if args are empty', () => {
            expect(encodeContructorArguments([], [])).toBeUndefined()
        })

        it('should throw an error if there is no constructor fragment', () => {
            expect(() => encodeContructorArguments([{}], [1])).toThrow('invalid fragment object')
        })

        it.each([
            [
                '0000000000000000000000006ab5ae6822647046626e83ee6db8187151e1d5ab',
                ['0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab'],
                [
                    {
                        inputs: [
                            {
                                internalType: 'address',
                                name: '_endpoint',
                                type: 'address',
                            },
                        ],
                        stateMutability: 'nonpayable',
                        type: 'constructor',
                    },
                ],
            ],
            [
                '0000000000000000000000004d73adb72bc3dd368966edd0f0b2148401a178e2',
                ['0x4D73AdB72bC3DD368966edD0f0b2148401A178E2'],
                [
                    {
                        inputs: [
                            {
                                internalType: 'address',
                                name: '_ulnv2',
                                type: 'address',
                            },
                        ],
                        stateMutability: 'nonpayable',
                        type: 'constructor',
                    },
                ],
            ],
        ])('should return %s for arguments %j and ABI %j', (encoded, args, abi) => {
            expect(encodeContructorArguments(abi, args)).toBe(encoded)
        })
    })
})
