export type Endpoint = {
    version: '0.1.0'
    name: 'endpoint'
    instructions: [
        {
            name: 'registerOapp'
            accounts: [
                {
                    name: 'payer'
                    isMut: true
                    isSigner: true
                },
                {
                    name: 'oapp'
                    isMut: false
                    isSigner: true
                    docs: ['The PDA of the OApp']
                },
                {
                    name: 'oappRegistry'
                    isMut: true
                    isSigner: false
                },
                {
                    name: 'systemProgram'
                    isMut: false
                    isSigner: false
                },
                {
                    name: 'eventAuthority'
                    isMut: false
                    isSigner: false
                },
                {
                    name: 'program'
                    isMut: false
                    isSigner: false
                },
            ]
            args: [
                {
                    name: 'params'
                    type: {
                        defined: 'RegisterOAppParams'
                    }
                },
            ]
        },
    ]
    accounts: [
        {
            name: 'oAppRegistry'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'delegate'
                        type: 'publicKey'
                    },
                    {
                        name: 'bump'
                        type: 'u8'
                    },
                ]
            }
        },
    ]
    types: [
        {
            name: 'RegisterOAppParams'
            type: {
                kind: 'struct'
                fields: [
                    {
                        name: 'delegate'
                        type: 'publicKey'
                    },
                ]
            }
        },
    ]
}

export const IDL: Endpoint = {
    version: '0.1.0',
    name: 'endpoint',
    instructions: [
        {
            name: 'registerOapp',
            accounts: [
                {
                    name: 'payer',
                    isMut: true,
                    isSigner: true,
                },
                {
                    name: 'oapp',
                    isMut: false,
                    isSigner: true,
                    docs: ['The PDA of the OApp'],
                },
                {
                    name: 'oappRegistry',
                    isMut: true,
                    isSigner: false,
                },
                {
                    name: 'systemProgram',
                    isMut: false,
                    isSigner: false,
                },
                {
                    name: 'eventAuthority',
                    isMut: false,
                    isSigner: false,
                },
                {
                    name: 'program',
                    isMut: false,
                    isSigner: false,
                },
            ],
            args: [
                {
                    name: 'params',
                    type: {
                        defined: 'RegisterOAppParams',
                    },
                },
            ],
        },
    ],
    accounts: [
        {
            name: 'oAppRegistry',
            type: {
                kind: 'struct',
                fields: [
                    {
                        name: 'delegate',
                        type: 'publicKey',
                    },
                    {
                        name: 'bump',
                        type: 'u8',
                    },
                ],
            },
        },
    ],
    types: [
        {
            name: 'RegisterOAppParams',
            type: {
                kind: 'struct',
                fields: [
                    {
                        name: 'delegate',
                        type: 'publicKey',
                    },
                ],
            },
        },
    ],
}
