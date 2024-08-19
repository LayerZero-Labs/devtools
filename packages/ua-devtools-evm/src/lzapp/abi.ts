export const abi = [
    {
        inputs: [{ internalType: 'uint16', name: '_remoteChainId', type: 'uint16' }],
        name: 'getTrustedRemoteAddress',
        outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint16', name: '_remoteChainId', type: 'uint16' },
            { internalType: 'bytes', name: '_remoteAddress', type: 'bytes' },
        ],
        name: 'setTrustedRemoteAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
]
