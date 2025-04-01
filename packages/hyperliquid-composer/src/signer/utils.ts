import { Wallet } from 'ethers'

/** Checks if the given value is an abstract ethers v5 signer. */
export function isAbstractEthersV5Signer(client: unknown): client is Wallet {
    return (
        typeof client === 'object' &&
        client !== null &&
        '_signTypedData' in client &&
        typeof client._signTypedData === 'function' &&
        client._signTypedData.length === 3
    )
}
