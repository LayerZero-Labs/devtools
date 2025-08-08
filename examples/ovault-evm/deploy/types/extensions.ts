type TokenDeployConfig = {
    contractName: string
    tokenName: string
    tokenSymbol: string
}

type Vault = {
    vault: string
    shareAdapterContractName: string
    composer: string
}

type ContractAddress = string
type OFTAddress = ContractAddress

// Union type: Token can be either a deploy config or just an address string
type Token = TokenDeployConfig | OFTAddress

export { ContractAddress, OFTAddress, Token, TokenDeployConfig, Vault }
