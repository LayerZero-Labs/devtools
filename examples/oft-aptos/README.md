# Deploy Aptos OFT on Local Node

## Prerequisites
- Aptos CLI

## Setup Instructions

1. Download and install the Aptos CLI
   ```bash
   # Installation instructions for Aptos CLI here
   ```

2. Generate a private key and save the account address
   ```bash
   aptos key generate --output-file my_key
   # Save the account address shown in the output, it will look like:
   # Account Address: 0x978c213990c4833df71548df7ce49d54c759d6b6d932de22b24d56060b7af2aa
   ```

3. Initialize Aptos CLI
   ```bash
   aptos init
   ```
   When prompted:
   - Choose "custom" 
   - API URL: `https://localhost:8080/v1`
   - Faucet URL: `https://localhost:8081/v1`
   - Enter your private key when requested

4. run the command to build the oft module
   ```bash
   aptos move build --named-addresses oft=<your-account-address> --package-dir oft
   ```

## Reference
Private Key: `0xaaaad3081caa70f3fdd1d2f587d6da200ff8a5128ef179e8092a5294cce3e9f8`