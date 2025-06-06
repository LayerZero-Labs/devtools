### Wiring Solana to Aptos

:warning: **Important limitations for Solana ↔ Aptos pathways:**

Currently, you can only do **one-way wiring from Solana → Aptos** using this example. For the reverse pathway (Aptos → Solana), you must use the [OFT Aptos Move example](https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-aptos-move).

#### Configuration Requirements for Solana → Aptos

When setting up Solana to Aptos wiring, ensure you:

1. **Set the Aptos contract address**: In your `layerzero.config.ts`, manually specify the `address` field for your Aptos contract:

```typescript
const aptosContract: OmniPointHardhat = {
  eid: EndpointId.APTOS_V2_TESTNET,
  address: "0xYOUR_DEPLOYED_APTOS_CONTRACT_ADDRESS", // Replace with your actual Aptos contract address
};
```

2. **Use manual configuration**: The simple config generator (`generateConnectionsConfig`) does not currently support Aptos pathways. You must use the regular configuration format.

3. **Configuration resources**:
   - [LayerZero Configuration Documentation](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/configuring-pathways)
   - [Example Aptos Move config file](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-aptos-move/move.layerzero.config.ts)

:information_source: For bidirectional Solana ↔ Aptos communication, deploy both:

- Solana → Aptos: Use this example
- Aptos → Solana: Use the [OFT Aptos Move example](https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-aptos-move)
