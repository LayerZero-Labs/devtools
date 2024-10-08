export type Oft = {
  "version": "0.1.0",
  "name": "oft",
  "instructions": [
    {
      "name": "oftVersion",
      "accounts": [],
      "args": [],
      "returns": {
        "defined": "Version"
      }
    },
    {
      "name": "initOft",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lzReceiveTypesAccounts",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "InitOFTParams"
          }
        }
      ]
    },
    {
      "name": "setOftConfig",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetOFTConfigParams"
          }
        }
      ]
    },
    {
      "name": "setPeerConfig",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetPeerConfigParams"
          }
        }
      ]
    },
    {
      "name": "setPause",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "pauser or unpauser"
          ]
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetPauseParams"
          }
        }
      ]
    },
    {
      "name": "withdrawFee",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenDest",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "WithdrawFeeParams"
          }
        }
      ]
    },
    {
      "name": "quoteOft",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "peer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "QuoteOFTParams"
          }
        }
      ],
      "returns": {
        "defined": "QuoteOFTResult"
      }
    },
    {
      "name": "quoteSend",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "peer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "QuoteSendParams"
          }
        }
      ],
      "returns": {
        "defined": "MessagingFee"
      }
    },
    {
      "name": "send",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "eventAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SendParams"
          }
        }
      ]
    },
    {
      "name": "lzReceive",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toAddress",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenDest",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintAuthority",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "eventAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "LzReceiveParams"
          }
        }
      ]
    },
    {
      "name": "lzReceiveTypes",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "LzReceiveParams"
          }
        }
      ],
      "returns": {
        "vec": {
          "defined": "LzAccount"
        }
      }
    }
  ],
  "accounts": [
    {
      "name": "lzReceiveTypesAccounts",
      "docs": [
        "LzReceiveTypesAccounts includes accounts that are used in the LzReceiveTypes",
        "instruction."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftStore",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "oftStore",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftType",
            "type": {
              "defined": "OFTType"
            }
          },
          {
            "name": "ld2sdRate",
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "tokenEscrow",
            "type": "publicKey"
          },
          {
            "name": "endpointProgram",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tvlLd",
            "type": "u64"
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "defaultFeeBps",
            "type": "u16"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "pauser",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "unpauser",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "peerConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "peerAddress",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "enforcedOptions",
            "type": {
              "defined": "EnforcedOptions"
            }
          },
          {
            "name": "outboundRateLimiter",
            "type": {
              "option": {
                "defined": "RateLimiter"
              }
            }
          },
          {
            "name": "inboundRateLimiter",
            "type": {
              "option": {
                "defined": "RateLimiter"
              }
            }
          },
          {
            "name": "feeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "MessagingFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nativeFee",
            "type": "u64"
          },
          {
            "name": "lzTokenFee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "LzReceiveParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "srcEid",
            "type": "u32"
          },
          {
            "name": "sender",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "guid",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "extraData",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "LzAccount",
      "docs": [
        "same to anchor_lang::prelude::AccountMeta"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Version",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "interface",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "InitOFTParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftType",
            "type": {
              "defined": "OFTType"
            }
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "sharedDecimals",
            "type": "u8"
          },
          {
            "name": "endpointProgram",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "OFTFeeDetail",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeAmountLd",
            "type": "u64"
          },
          {
            "name": "description",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "OFTLimits",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "maxAmountLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OFTReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountSentLd",
            "type": "u64"
          },
          {
            "name": "amountReceivedLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "QuoteOFTParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "payInLzToken",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "QuoteOFTResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftLimits",
            "type": {
              "defined": "OFTLimits"
            }
          },
          {
            "name": "oftFeeDetails",
            "type": {
              "vec": {
                "defined": "OFTFeeDetail"
              }
            }
          },
          {
            "name": "oftReceipt",
            "type": {
              "defined": "OFTReceipt"
            }
          }
        ]
      }
    },
    {
      "name": "QuoteSendParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "payInLzToken",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "SendParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "nativeFee",
            "type": "u64"
          },
          {
            "name": "lzTokenFee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "SetOFTConfigParams",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Admin",
            "fields": [
              "publicKey"
            ]
          },
          {
            "name": "Delegate",
            "fields": [
              "publicKey"
            ]
          },
          {
            "name": "DefaultFee",
            "fields": [
              "u16"
            ]
          },
          {
            "name": "Paused",
            "fields": [
              "bool"
            ]
          },
          {
            "name": "Pauser",
            "fields": [
              {
                "option": "publicKey"
              }
            ]
          },
          {
            "name": "Unpauser",
            "fields": [
              {
                "option": "publicKey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "SetPauseParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "PeerConfigParam",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PeerAddress",
            "fields": [
              {
                "array": [
                  "u8",
                  32
                ]
              }
            ]
          },
          {
            "name": "FeeBps",
            "fields": [
              {
                "option": "u16"
              }
            ]
          },
          {
            "name": "EnforcedOptions",
            "fields": [
              {
                "name": "send",
                "type": "bytes"
              },
              {
                "name": "sendAndCall",
                "type": "bytes"
              }
            ]
          },
          {
            "name": "OutboundRateLimit",
            "fields": [
              {
                "option": {
                  "defined": "RateLimitParams"
                }
              }
            ]
          },
          {
            "name": "InboundRateLimit",
            "fields": [
              {
                "option": {
                  "defined": "RateLimitParams"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "RateLimitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "refillPerSecond",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "capacity",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "SetPeerConfigParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "remoteEid",
            "type": "u32"
          },
          {
            "name": "config",
            "type": {
              "defined": "PeerConfigParam"
            }
          }
        ]
      }
    },
    {
      "name": "WithdrawFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OFTType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Native"
          },
          {
            "name": "Adapter"
          }
        ]
      }
    },
    {
      "name": "EnforcedOptions",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "send",
            "type": "bytes"
          },
          {
            "name": "sendAndCall",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "RateLimiter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capacity",
            "type": "u64"
          },
          {
            "name": "tokens",
            "type": "u64"
          },
          {
            "name": "refillPerSecond",
            "type": "u64"
          },
          {
            "name": "lastRefillTime",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "OFTReceived",
      "fields": [
        {
          "name": "guid",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "srcEid",
          "type": "u32",
          "index": false
        },
        {
          "name": "to",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountReceivedLd",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "OFTSent",
      "fields": [
        {
          "name": "guid",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "dstEid",
          "type": "u32",
          "index": false
        },
        {
          "name": "from",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountSentLd",
          "type": "u64",
          "index": false
        },
        {
          "name": "amountReceivedLd",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized"
    },
    {
      "code": 6001,
      "name": "InvalidSender"
    },
    {
      "code": 6002,
      "name": "InvalidDecimals"
    },
    {
      "code": 6003,
      "name": "SlippageExceeded"
    },
    {
      "code": 6004,
      "name": "InvalidTokenDest"
    },
    {
      "code": 6005,
      "name": "RateLimitExceeded"
    },
    {
      "code": 6006,
      "name": "InvalidFee"
    },
    {
      "code": 6007,
      "name": "InvalidMintAuthority"
    },
    {
      "code": 6008,
      "name": "Paused"
    }
  ]
};

export const IDL: Oft = {
  "version": "0.1.0",
  "name": "oft",
  "instructions": [
    {
      "name": "oftVersion",
      "accounts": [],
      "args": [],
      "returns": {
        "defined": "Version"
      }
    },
    {
      "name": "initOft",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lzReceiveTypesAccounts",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "InitOFTParams"
          }
        }
      ]
    },
    {
      "name": "setOftConfig",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetOFTConfigParams"
          }
        }
      ]
    },
    {
      "name": "setPeerConfig",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetPeerConfigParams"
          }
        }
      ]
    },
    {
      "name": "setPause",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "pauser or unpauser"
          ]
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SetPauseParams"
          }
        }
      ]
    },
    {
      "name": "withdrawFee",
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenDest",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "WithdrawFeeParams"
          }
        }
      ]
    },
    {
      "name": "quoteOft",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "peer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "QuoteOFTParams"
          }
        }
      ],
      "returns": {
        "defined": "QuoteOFTResult"
      }
    },
    {
      "name": "quoteSend",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "peer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "QuoteSendParams"
          }
        }
      ],
      "returns": {
        "defined": "MessagingFee"
      }
    },
    {
      "name": "send",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "eventAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SendParams"
          }
        }
      ]
    },
    {
      "name": "lzReceive",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "peer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "oftStore",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toAddress",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenDest",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintAuthority",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "eventAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "program",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "LzReceiveParams"
          }
        }
      ]
    },
    {
      "name": "lzReceiveTypes",
      "accounts": [
        {
          "name": "oftStore",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "LzReceiveParams"
          }
        }
      ],
      "returns": {
        "vec": {
          "defined": "LzAccount"
        }
      }
    }
  ],
  "accounts": [
    {
      "name": "lzReceiveTypesAccounts",
      "docs": [
        "LzReceiveTypesAccounts includes accounts that are used in the LzReceiveTypes",
        "instruction."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftStore",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "oftStore",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftType",
            "type": {
              "defined": "OFTType"
            }
          },
          {
            "name": "ld2sdRate",
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "tokenEscrow",
            "type": "publicKey"
          },
          {
            "name": "endpointProgram",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tvlLd",
            "type": "u64"
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "defaultFeeBps",
            "type": "u16"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "pauser",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "unpauser",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "peerConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "peerAddress",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "enforcedOptions",
            "type": {
              "defined": "EnforcedOptions"
            }
          },
          {
            "name": "outboundRateLimiter",
            "type": {
              "option": {
                "defined": "RateLimiter"
              }
            }
          },
          {
            "name": "inboundRateLimiter",
            "type": {
              "option": {
                "defined": "RateLimiter"
              }
            }
          },
          {
            "name": "feeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "MessagingFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nativeFee",
            "type": "u64"
          },
          {
            "name": "lzTokenFee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "LzReceiveParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "srcEid",
            "type": "u32"
          },
          {
            "name": "sender",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "guid",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "extraData",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "LzAccount",
      "docs": [
        "same to anchor_lang::prelude::AccountMeta"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Version",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "interface",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "InitOFTParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftType",
            "type": {
              "defined": "OFTType"
            }
          },
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "sharedDecimals",
            "type": "u8"
          },
          {
            "name": "endpointProgram",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "OFTFeeDetail",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeAmountLd",
            "type": "u64"
          },
          {
            "name": "description",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "OFTLimits",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "maxAmountLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OFTReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountSentLd",
            "type": "u64"
          },
          {
            "name": "amountReceivedLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "QuoteOFTParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "payInLzToken",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "QuoteOFTResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oftLimits",
            "type": {
              "defined": "OFTLimits"
            }
          },
          {
            "name": "oftFeeDetails",
            "type": {
              "vec": {
                "defined": "OFTFeeDetail"
              }
            }
          },
          {
            "name": "oftReceipt",
            "type": {
              "defined": "OFTReceipt"
            }
          }
        ]
      }
    },
    {
      "name": "QuoteSendParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "payInLzToken",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "SendParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstEid",
            "type": "u32"
          },
          {
            "name": "to",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amountLd",
            "type": "u64"
          },
          {
            "name": "minAmountLd",
            "type": "u64"
          },
          {
            "name": "options",
            "type": "bytes"
          },
          {
            "name": "composeMsg",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "nativeFee",
            "type": "u64"
          },
          {
            "name": "lzTokenFee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "SetOFTConfigParams",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Admin",
            "fields": [
              "publicKey"
            ]
          },
          {
            "name": "Delegate",
            "fields": [
              "publicKey"
            ]
          },
          {
            "name": "DefaultFee",
            "fields": [
              "u16"
            ]
          },
          {
            "name": "Paused",
            "fields": [
              "bool"
            ]
          },
          {
            "name": "Pauser",
            "fields": [
              {
                "option": "publicKey"
              }
            ]
          },
          {
            "name": "Unpauser",
            "fields": [
              {
                "option": "publicKey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "SetPauseParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "PeerConfigParam",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PeerAddress",
            "fields": [
              {
                "array": [
                  "u8",
                  32
                ]
              }
            ]
          },
          {
            "name": "FeeBps",
            "fields": [
              {
                "option": "u16"
              }
            ]
          },
          {
            "name": "EnforcedOptions",
            "fields": [
              {
                "name": "send",
                "type": "bytes"
              },
              {
                "name": "sendAndCall",
                "type": "bytes"
              }
            ]
          },
          {
            "name": "OutboundRateLimit",
            "fields": [
              {
                "option": {
                  "defined": "RateLimitParams"
                }
              }
            ]
          },
          {
            "name": "InboundRateLimit",
            "fields": [
              {
                "option": {
                  "defined": "RateLimitParams"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "RateLimitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "refillPerSecond",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "capacity",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "SetPeerConfigParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "remoteEid",
            "type": "u32"
          },
          {
            "name": "config",
            "type": {
              "defined": "PeerConfigParam"
            }
          }
        ]
      }
    },
    {
      "name": "WithdrawFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeLd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OFTType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Native"
          },
          {
            "name": "Adapter"
          }
        ]
      }
    },
    {
      "name": "EnforcedOptions",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "send",
            "type": "bytes"
          },
          {
            "name": "sendAndCall",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "RateLimiter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "capacity",
            "type": "u64"
          },
          {
            "name": "tokens",
            "type": "u64"
          },
          {
            "name": "refillPerSecond",
            "type": "u64"
          },
          {
            "name": "lastRefillTime",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "OFTReceived",
      "fields": [
        {
          "name": "guid",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "srcEid",
          "type": "u32",
          "index": false
        },
        {
          "name": "to",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountReceivedLd",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "OFTSent",
      "fields": [
        {
          "name": "guid",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "dstEid",
          "type": "u32",
          "index": false
        },
        {
          "name": "from",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amountSentLd",
          "type": "u64",
          "index": false
        },
        {
          "name": "amountReceivedLd",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized"
    },
    {
      "code": 6001,
      "name": "InvalidSender"
    },
    {
      "code": 6002,
      "name": "InvalidDecimals"
    },
    {
      "code": 6003,
      "name": "SlippageExceeded"
    },
    {
      "code": 6004,
      "name": "InvalidTokenDest"
    },
    {
      "code": 6005,
      "name": "RateLimitExceeded"
    },
    {
      "code": 6006,
      "name": "InvalidFee"
    },
    {
      "code": 6007,
      "name": "InvalidMintAuthority"
    },
    {
      "code": 6008,
      "name": "Paused"
    }
  ]
};