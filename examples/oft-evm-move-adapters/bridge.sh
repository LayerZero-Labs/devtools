#!/bin/bash

RPC_URL="https://bsc-testnet.public.blastapi.io"

AMOUNT="1000000000000000000" 

# EXPORT YOUR PRIVATE_KEY TO THE ENVIRONMENT BEFORE PROCEEDING

# OFT Adapter addresses
USDCOFT_ADAPTER="0x9078C798192C04d473F259A86aC97d6d9D5863Ba"
USDTOFT_ADAPTER="0xf9F7D5D9eD90B4706111653D75B187DF3283eE29"
WETHOFT_ADAPTER="0x2E067e69598cfd2c110bC1A61a8e121f36e464Bf"

# Mock token addresses
USDC_TOKEN="0x3D40fF7Ff9D5B01Cb5413e7E5C18Aa104A6506a5"
USDT_TOKEN="0xC1c94Dde81053612aC602ba39b6AfBd3CfE6a8Bc"
WETH_TOKEN="0x50e288885258bC62da02d7Bd1e37d5c7B27F814F"

# Max uint256 for approval
MAX_UINT256="115792089237316195423570985008687907853269984665640564039457584007913129639935"

# Caller address in ETHEREUM
PUBLIC_ADDRESS=0x65E467bB02984c535a79D28f6538318F46FF9A5B
# Recipient address in MOVEMENT
RECIPIENT_ADDRESS="0xb10acc8eb83aa4852a1559caa9633427458ef084f9b9febec6ad8558ad709355"

TARGET_EID=40325

process_asset() {
    local TOKEN_ADDRESS=$1
    local OFT_ADAPTER=$2
    local ASSET_NAME=$3

    echo "Processing $ASSET_NAME..."

    echo "Minting $ASSET_NAME..."
    cast send "$TOKEN_ADDRESS" "mint(address,uint256)" "$PUBLIC_ADDRESS"  "$AMOUNT" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"

    echo "Checking allowance for $ASSET_NAME..."
    ALLOWANCE=$(cast call "$TOKEN_ADDRESS" "allowance(address,address)" "$PUBLIC_ADDRESS" "$OFT_ADAPTER" --rpc-url "$RPC_URL")

    echo "Allowance for $ASSET_NAME: $ALLOWANCE"

    if [[ "$ALLOWANCE" -lt "$AMOUNT" ]]; then
        echo "Approving $ASSET_NAME for OFT Adapter..."
        cast send "$TOKEN_ADDRESS" --rpc-url "$RPC_URL" "approve(address,uint256)" "$OFT_ADAPTER" "$MAX_UINT256" --private-key "$PRIVATE_KEY"
    fi

    echo "Quoting transfer fee for $ASSET_NAME..."
    QUOTE_RESULT=$(cast call "$OFT_ADAPTER" --rpc-url "$RPC_URL" "quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool)" "($TARGET_EID,$RECIPIENT_ADDRESS,$AMOUNT,$AMOUNT,0x,0x,0x)" false --private-key "$PRIVATE_KEY")

    NATIVE_FEE_HEX=$(echo "$QUOTE_RESULT" | cut -c 1-66)
    NATIVE_FEE=$(cast --to-dec "$NATIVE_FEE_HEX")


    echo "Quoted native fee for $ASSET_NAME: $NATIVE_FEE"

    # Send the tokens
    echo "Sending $ASSET_NAME..."
    cast send "$OFT_ADAPTER" --rpc-url "$RPC_URL" "send((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),(uint256,uint256),address)" "($TARGET_EID,$RECIPIENT_ADDRESS,$AMOUNT,$AMOUNT,0x,0x,0x)" "($NATIVE_FEE,0)" $PUBLIC_ADDRESS --value "$NATIVE_FEE" --private-key "$PRIVATE_KEY"

    echo "$ASSET_NAME processing complete."
}

# Process each asset
process_asset "$USDC_TOKEN" "$USDCOFT_ADAPTER" "USDC"
process_asset "$USDT_TOKEN" "$USDTOFT_ADAPTER" "USDT"
process_asset "$WETH_TOKEN" "$WETHOFT_ADAPTER" "WETH"

echo "All transactions completed."
