export const OVaultComposerSyncNativeAbi = [
    {
        type: 'constructor',
        inputs: [
            {
                name: '_vault',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_assetOFT',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_shareOFT',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'receive',
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'ASSET_ERC20',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'ASSET_OFT',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'ENDPOINT',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'SHARE_ERC20',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'SHARE_OFT',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'VAULT',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'contract IERC4626',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'VAULT_EID',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'depositAndSend',
        inputs: [
            {
                name: '_assetAmount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: '_sendParam',
                type: 'tuple',
                internalType: 'struct SendParam',
                components: [
                    {
                        name: 'dstEid',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'to',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'amountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'minAmountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'extraOptions',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'composeMsg',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'oftCmd',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
            },
            {
                name: '_refundAddress',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'depositNativeAndSend',
        inputs: [
            {
                name: '_assetAmount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: '_sendParam',
                type: 'tuple',
                internalType: 'struct SendParam',
                components: [
                    {
                        name: 'dstEid',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'to',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'amountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'minAmountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'extraOptions',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'composeMsg',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'oftCmd',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
            },
            {
                name: '_refundAddress',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'handleCompose',
        inputs: [
            {
                name: '_oftIn',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_composeFrom',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: '_composeMsg',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: '_amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'lzCompose',
        inputs: [
            {
                name: '_composeSender',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_guid',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: '_message',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'function',
        name: 'quoteSend',
        inputs: [
            {
                name: '_from',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_targetOFT',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_vaultInAmount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: '_sendParam',
                type: 'tuple',
                internalType: 'struct SendParam',
                components: [
                    {
                        name: 'dstEid',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'to',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'amountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'minAmountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'extraOptions',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'composeMsg',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'oftCmd',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
            },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple',
                internalType: 'struct MessagingFee',
                components: [
                    {
                        name: 'nativeFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'lzTokenFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'redeemAndSend',
        inputs: [
            {
                name: '_shareAmount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: '_sendParam',
                type: 'tuple',
                internalType: 'struct SendParam',
                components: [
                    {
                        name: 'dstEid',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'to',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'amountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'minAmountLD',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'extraOptions',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'composeMsg',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                    {
                        name: 'oftCmd',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
            },
            {
                name: '_refundAddress',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'payable',
    },
    {
        type: 'event',
        name: 'Deposited',
        inputs: [
            {
                name: 'sender',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'recipient',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'dstEid',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'assetAmt',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'shareAmt',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Redeemed',
        inputs: [
            {
                name: 'sender',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'recipient',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'dstEid',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'shareAmt',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'assetAmt',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Refunded',
        inputs: [
            {
                name: 'guid',
                type: 'bytes32',
                indexed: true,
                internalType: 'bytes32',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Sent',
        inputs: [
            {
                name: 'guid',
                type: 'bytes32',
                indexed: true,
                internalType: 'bytes32',
            },
        ],
        anonymous: false,
    },
    {
        type: 'error',
        name: 'AmountExceedsMsgValue',
        inputs: [],
    },
    {
        type: 'error',
        name: 'AssetOFTTokenNotNative',
        inputs: [],
    },
    {
        type: 'error',
        name: 'AssetTokenNotVaultAsset',
        inputs: [
            {
                name: 'assetERC20',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'vaultAsset',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC4626ExceededMaxDeposit',
        inputs: [
            {
                name: 'receiver',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'assets',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'max',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC4626ExceededMaxRedeem',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'shares',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'max',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'InsufficientMsgValue',
        inputs: [
            {
                name: 'expectedMsgValue',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'actualMsgValue',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'NoMsgValueExpected',
        inputs: [],
    },
    {
        type: 'error',
        name: 'OnlyEndpoint',
        inputs: [
            {
                name: 'caller',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'OnlySelf',
        inputs: [
            {
                name: 'caller',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'OnlyValidComposeCaller',
        inputs: [
            {
                name: 'caller',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ReentrancyGuardReentrantCall',
        inputs: [],
    },
    {
        type: 'error',
        name: 'SafeERC20FailedOperation',
        inputs: [
            {
                name: 'token',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ShareOFTNotAdapter',
        inputs: [
            {
                name: 'shareOFT',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ShareTokenNotVault',
        inputs: [
            {
                name: 'shareERC20',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'vault',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'SlippageExceeded',
        inputs: [
            {
                name: 'amountLD',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'minAmountLD',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
] as const
