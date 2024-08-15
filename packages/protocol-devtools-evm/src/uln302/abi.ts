export const abi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: '_endpoint',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_treasuryGasLimit',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: '_treasuryGasForFeeCap',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'DVN_InvalidDVNIdx',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'cursor',
                type: 'uint256',
            },
        ],
        name: 'DVN_InvalidDVNOptions',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_CannotWithdrawAltToken',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'requested',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'available',
                type: 'uint256',
            },
        ],
        name: 'LZ_MessageLib_InvalidAmount',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_InvalidExecutor',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'actual',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'max',
                type: 'uint256',
            },
        ],
        name: 'LZ_MessageLib_InvalidMessageSize',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_NotTreasury',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_OnlyEndpoint',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_TransferFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_MessageLib_ZeroMessageSize',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_AtLeastOneDVN',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint32',
                name: 'configType',
                type: 'uint32',
            },
        ],
        name: 'LZ_ULN_InvalidConfigType',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidConfirmations',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidLegacyType1Option',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidLegacyType2Option',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidOptionalDVNCount',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidOptionalDVNThreshold',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_InvalidRequiredDVNCount',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint8',
                name: 'workerId',
                type: 'uint8',
            },
        ],
        name: 'LZ_ULN_InvalidWorkerId',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'cursor',
                type: 'uint256',
            },
        ],
        name: 'LZ_ULN_InvalidWorkerOptions',
        type: 'error',
    },
    {
        inputs: [],
        name: 'LZ_ULN_Unsorted',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint32',
                name: 'eid',
                type: 'uint32',
            },
        ],
        name: 'LZ_ULN_UnsupportedEid',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint16',
                name: 'optionType',
                type: 'uint16',
            },
        ],
        name: 'LZ_ULN_UnsupportedOptionType',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'Transfer_NativeFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'Transfer_ToAddressIsZero',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address[]',
                name: 'requiredDVNs',
                type: 'address[]',
            },
            {
                indexed: false,
                internalType: 'address[]',
                name: 'optionalDVNs',
                type: 'address[]',
            },
            {
                indexed: false,
                internalType: 'uint256[]',
                name: 'fees',
                type: 'uint256[]',
            },
        ],
        name: 'DVNFeePaid',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'eid',
                        type: 'uint32',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint32',
                                name: 'maxMessageSize',
                                type: 'uint32',
                            },
                            {
                                internalType: 'address',
                                name: 'executor',
                                type: 'address',
                            },
                        ],
                        internalType: 'struct ExecutorConfig',
                        name: 'config',
                        type: 'tuple',
                    },
                ],
                indexed: false,
                internalType: 'struct SetDefaultExecutorConfigParam[]',
                name: 'params',
                type: 'tuple[]',
            },
        ],
        name: 'DefaultExecutorConfigsSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'eid',
                        type: 'uint32',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint64',
                                name: 'confirmations',
                                type: 'uint64',
                            },
                            {
                                internalType: 'uint8',
                                name: 'requiredDVNCount',
                                type: 'uint8',
                            },
                            {
                                internalType: 'uint8',
                                name: 'optionalDVNCount',
                                type: 'uint8',
                            },
                            {
                                internalType: 'uint8',
                                name: 'optionalDVNThreshold',
                                type: 'uint8',
                            },
                            {
                                internalType: 'address[]',
                                name: 'requiredDVNs',
                                type: 'address[]',
                            },
                            {
                                internalType: 'address[]',
                                name: 'optionalDVNs',
                                type: 'address[]',
                            },
                        ],
                        internalType: 'struct UlnConfig',
                        name: 'config',
                        type: 'tuple',
                    },
                ],
                indexed: false,
                internalType: 'struct SetDefaultUlnConfigParam[]',
                name: 'params',
                type: 'tuple[]',
            },
        ],
        name: 'DefaultUlnConfigsSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'oapp',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint32',
                name: 'eid',
                type: 'uint32',
            },
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'maxMessageSize',
                        type: 'uint32',
                    },
                    {
                        internalType: 'address',
                        name: 'executor',
                        type: 'address',
                    },
                ],
                indexed: false,
                internalType: 'struct ExecutorConfig',
                name: 'config',
                type: 'tuple',
            },
        ],
        name: 'ExecutorConfigSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'executor',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'fee',
                type: 'uint256',
            },
        ],
        name: 'ExecutorFeePaid',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'lzToken',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'receiver',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'LzTokenFeeWithdrawn',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'worker',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'receiver',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'NativeFeeWithdrawn',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'previousOwner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'OwnershipTransferred',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newTreasuryNativeFeeCap',
                type: 'uint256',
            },
        ],
        name: 'TreasuryNativeFeeCapSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'treasury',
                type: 'address',
            },
        ],
        name: 'TreasurySet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'oapp',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint32',
                name: 'eid',
                type: 'uint32',
            },
            {
                components: [
                    {
                        internalType: 'uint64',
                        name: 'confirmations',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint8',
                        name: 'requiredDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNThreshold',
                        type: 'uint8',
                    },
                    {
                        internalType: 'address[]',
                        name: 'requiredDVNs',
                        type: 'address[]',
                    },
                    {
                        internalType: 'address[]',
                        name: 'optionalDVNs',
                        type: 'address[]',
                    },
                ],
                indexed: false,
                internalType: 'struct UlnConfig',
                name: 'config',
                type: 'tuple',
            },
        ],
        name: 'UlnConfigSet',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'oapp',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: 'eid',
                type: 'uint32',
            },
        ],
        name: 'executorConfigs',
        outputs: [
            {
                internalType: 'uint32',
                name: 'maxMessageSize',
                type: 'uint32',
            },
            {
                internalType: 'address',
                name: 'executor',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'worker',
                type: 'address',
            },
        ],
        name: 'fees',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oapp',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: '_remoteEid',
                type: 'uint32',
            },
        ],
        name: 'getAppUlnConfig',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint64',
                        name: 'confirmations',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint8',
                        name: 'requiredDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNThreshold',
                        type: 'uint8',
                    },
                    {
                        internalType: 'address[]',
                        name: 'requiredDVNs',
                        type: 'address[]',
                    },
                    {
                        internalType: 'address[]',
                        name: 'optionalDVNs',
                        type: 'address[]',
                    },
                ],
                internalType: 'struct UlnConfig',
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
                internalType: 'uint32',
                name: '_eid',
                type: 'uint32',
            },
            {
                internalType: 'address',
                name: '_oapp',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: '_configType',
                type: 'uint32',
            },
        ],
        name: 'getConfig',
        outputs: [
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oapp',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: '_remoteEid',
                type: 'uint32',
            },
        ],
        name: 'getExecutorConfig',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'maxMessageSize',
                        type: 'uint32',
                    },
                    {
                        internalType: 'address',
                        name: 'executor',
                        type: 'address',
                    },
                ],
                internalType: 'struct ExecutorConfig',
                name: 'rtnConfig',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oapp',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: '_remoteEid',
                type: 'uint32',
            },
        ],
        name: 'getUlnConfig',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint64',
                        name: 'confirmations',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint8',
                        name: 'requiredDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNCount',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint8',
                        name: 'optionalDVNThreshold',
                        type: 'uint8',
                    },
                    {
                        internalType: 'address[]',
                        name: 'requiredDVNs',
                        type: 'address[]',
                    },
                    {
                        internalType: 'address[]',
                        name: 'optionalDVNs',
                        type: 'address[]',
                    },
                ],
                internalType: 'struct UlnConfig',
                name: 'rtnConfig',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint32',
                name: '_eid',
                type: 'uint32',
            },
        ],
        name: 'isSupportedEid',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'messageLibType',
        outputs: [
            {
                internalType: 'enum MessageLibType',
                name: '',
                type: 'uint8',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'owner',
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
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint64',
                        name: 'nonce',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint32',
                        name: 'srcEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint32',
                        name: 'dstEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'receiver',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'guid',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'bytes',
                        name: 'message',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct Packet',
                name: '_packet',
                type: 'tuple',
            },
            {
                internalType: 'bytes',
                name: '_options',
                type: 'bytes',
            },
            {
                internalType: 'bool',
                name: '_payInLzToken',
                type: 'bool',
            },
        ],
        name: 'quote',
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
        inputs: [],
        name: 'renounceOwnership',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint64',
                        name: 'nonce',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint32',
                        name: 'srcEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint32',
                        name: 'dstEid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'receiver',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'bytes32',
                        name: 'guid',
                        type: 'bytes32',
                    },
                    {
                        internalType: 'bytes',
                        name: 'message',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct Packet',
                name: '_packet',
                type: 'tuple',
            },
            {
                internalType: 'bytes',
                name: '_options',
                type: 'bytes',
            },
            {
                internalType: 'bool',
                name: '_payInLzToken',
                type: 'bool',
            },
        ],
        name: 'send',
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
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_oapp',
                type: 'address',
            },
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'eid',
                        type: 'uint32',
                    },
                    {
                        internalType: 'uint32',
                        name: 'configType',
                        type: 'uint32',
                    },
                    {
                        internalType: 'bytes',
                        name: 'config',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SetConfigParam[]',
                name: '_params',
                type: 'tuple[]',
            },
        ],
        name: 'setConfig',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'eid',
                        type: 'uint32',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint32',
                                name: 'maxMessageSize',
                                type: 'uint32',
                            },
                            {
                                internalType: 'address',
                                name: 'executor',
                                type: 'address',
                            },
                        ],
                        internalType: 'struct ExecutorConfig',
                        name: 'config',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct SetDefaultExecutorConfigParam[]',
                name: '_params',
                type: 'tuple[]',
            },
        ],
        name: 'setDefaultExecutorConfigs',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'uint32',
                        name: 'eid',
                        type: 'uint32',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint64',
                                name: 'confirmations',
                                type: 'uint64',
                            },
                            {
                                internalType: 'uint8',
                                name: 'requiredDVNCount',
                                type: 'uint8',
                            },
                            {
                                internalType: 'uint8',
                                name: 'optionalDVNCount',
                                type: 'uint8',
                            },
                            {
                                internalType: 'uint8',
                                name: 'optionalDVNThreshold',
                                type: 'uint8',
                            },
                            {
                                internalType: 'address[]',
                                name: 'requiredDVNs',
                                type: 'address[]',
                            },
                            {
                                internalType: 'address[]',
                                name: 'optionalDVNs',
                                type: 'address[]',
                            },
                        ],
                        internalType: 'struct UlnConfig',
                        name: 'config',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct SetDefaultUlnConfigParam[]',
                name: '_params',
                type: 'tuple[]',
            },
        ],
        name: 'setDefaultUlnConfigs',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_treasury',
                type: 'address',
            },
        ],
        name: 'setTreasury',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '_newTreasuryNativeFeeCap',
                type: 'uint256',
            },
        ],
        name: 'setTreasuryNativeFeeCap',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: '_interfaceId',
                type: 'bytes4',
            },
        ],
        name: 'supportsInterface',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'transferOwnership',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'treasury',
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
        name: 'version',
        outputs: [
            {
                internalType: 'uint64',
                name: 'major',
                type: 'uint64',
            },
            {
                internalType: 'uint8',
                name: 'minor',
                type: 'uint8',
            },
            {
                internalType: 'uint8',
                name: 'endpointVersion',
                type: 'uint8',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_amount',
                type: 'uint256',
            },
        ],
        name: 'withdrawFee',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_lzToken',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_amount',
                type: 'uint256',
            },
        ],
        name: 'withdrawLzTokenFee',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const
