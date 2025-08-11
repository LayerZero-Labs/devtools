export const OVaultComposerSyncAbi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: '_ovault',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '_assetOFT',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '_shareOFT',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'assetERC20',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'vaultAsset',
                type: 'address',
            },
        ],
        name: 'AssetTokenNotVaultAsset',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'expectedMsgValue',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'actualMsgValue',
                type: 'uint256',
            },
        ],
        name: 'InsufficientMsgValue',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'caller',
                type: 'address',
            },
        ],
        name: 'OnlyEndpoint',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'caller',
                type: 'address',
            },
        ],
        name: 'OnlySelf',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'caller',
                type: 'address',
            },
        ],
        name: 'OnlyValidComposeCaller',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'SafeERC20FailedOperation',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'shareOFT',
                type: 'address',
            },
        ],
        name: 'ShareOFTNotAdapter',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'shareERC20',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'vault',
                type: 'address',
            },
        ],
        name: 'ShareTokenNotVault',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amountLD',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'minAmountLD',
                type: 'uint256',
            },
        ],
        name: 'SlippageExceeded',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'guid',
                type: 'bytes32',
            },
        ],
        name: 'Refunded',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'guid',
                type: 'bytes32',
            },
        ],
        name: 'Sent',
        type: 'event',
    },
    {
        inputs: [],
        name: 'ASSET_ERC20',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'ASSET_OFT',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'ENDPOINT',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'SHARE_ERC20',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'SHARE_OFT',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'VAULT',
        outputs: [
            {
                internalType: 'contract IERC4626',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'VAULT_EID',
        outputs: [
            {
                internalType: 'uint32',
                name: '',
                type: 'uint32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '_assetAmount',
                type: 'uint256',
            },
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'dstEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'to',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minAmountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'extraOptions',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'composeMsg',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'oftCmd',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SendParam',
                name: '_sendParam',
                type: 'tuple',
            },
            {
                internalType: 'address',
                name: '_refundAddress',
                type: 'address',
            },
        ],
        name: 'depositAndSend',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oftIn',
                type: 'address',
            },
            {
                internalType: 'bytes32',
                name: '_composeFrom',
                type: 'bytes32',
            },
            {
                internalType: 'bytes',
                name: '_composeMsg',
                type: 'bytes',
            },
            {
                internalType: 'uint256',
                name: '_amount',
                type: 'uint256',
            },
        ],
        name: 'handleCompose',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_composeCaller',
                type: 'address',
            },
            {
                internalType: 'bytes32',
                name: '_guid',
                type: 'bytes32',
            },
            {
                internalType: 'bytes',
                name: '_message',
                type: 'bytes',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'lzCompose',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oft',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_vaultInAmount',
                type: 'uint256',
            },
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'dstEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'to',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minAmountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'extraOptions',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'composeMsg',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'oftCmd',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SendParam',
                name: '_sendParam',
                type: 'tuple',
            },
        ],
        name: 'quoteSend',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'nativeFee',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'lzTokenFee',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct MessagingFee',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '_shareAmount',
                type: 'uint256',
            },
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'dstEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'to',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minAmountLD',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'extraOptions',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'composeMsg',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'oftCmd',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SendParam',
                name: '_sendParam',
                type: 'tuple',
            },
            {
                internalType: 'address',
                name: '_refundAddress',
                type: 'address',
            },
        ],
        name: 'redeemAndSend',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const
