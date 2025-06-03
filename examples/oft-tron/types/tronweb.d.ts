declare module 'tronweb' {
    export class TronWeb {
        constructor(options: { fullNode: string; solidityNode: string; eventServer: string; privateKey: string })
        contract(abi: any[], address: string): Promise<any>
        defaultAddress: {
            hex: string
        }
        trx: {
            getContract(contractName: string): Promise<{ address: string }>
        }
    }
}
