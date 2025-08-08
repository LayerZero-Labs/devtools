type TokenMetadata = {
    contractName: string
    tokenName: string
    tokenSymbol: string
}

type VaultConfig = {
    eid: number
    vault: string
    shareAdapterContractName: string
    composer: string
}

type OFTAddress = string

type TokenMetadataOrAddress = TokenMetadata | OFTAddress

type OFTConfigAsset = {
    oft: TokenMetadataOrAddress
    networks: Array<number>
}

type OFTConfigShare = {
    oft: TokenMetadata
    networks: Array<number>
}

export { OFTAddress, TokenMetadataOrAddress, TokenMetadata, VaultConfig, OFTConfigAsset, OFTConfigShare }
