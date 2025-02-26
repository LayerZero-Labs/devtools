#!/bin/bash

RPC_URL="https://testnet.bardock.movementnetwork.xyz/v1"

AMOUNT="1000000" # only sending back 1 token

# EXPORT YOUR PRIVATE_KEY TO THE ENVIRONMENT BEFORE PROCEEDING
# REQUIRES APTOS CLI TO BE INSTALLED

# OFT Adapter addresses

# Mock token addresses
USDC_TOKEN="0x33987308d6698c3def1f155c8ea394360e9756b0a22e64fb20834327f04a1e42"
USDT_TOKEN="0x9cda672762a6f88e4b608428dd063e03aaf6712f0a427923dd0f1416afa1c075"
WETH_TOKEN="0x2fa1f2914aa17d239410cb81ab46dd8fa9230272c58bc84e9e8b971eded79ca5"

# Recipient address in ETHEREUM
RECIPIENT_ADDRESS="0x65E467bB02984c535a79D28f6538318F46FF9A5B"
# Caller address in MOVEMENT
PUBLIC_ADDRESS="0x275f508689de8756169d1ee02d889c777de1cebda3a7bbcce63ba8a27c563c6f"

TARGET_EID=40102 #BSC

process_asset() {
    local TOKEN_ADDRESS=$1
    local ASSET_NAME=$2

    RECIPIENT_ADDRESS="0x$(printf "%064s" "${RECIPIENT_ADDRESS#0x}" | sed 's/ /0/g')"

    # requires balance in Movement
    echo "Processing $ASSET_NAME..."

    echo "Quoting transfer fee for $ASSET_NAME..."
    #  quote_send(address, u32, vector<u8>, u64, u64, vector<u8>, vector<u8>, vector<u8>, bool)
    QUOTE_RESULT=$(aptos move view --function-id $TOKEN_ADDRESS::oft::quote_send --args address:$PUBLIC_ADDRESS u32:$TARGET_EID hex:$RECIPIENT_ADDRESS u64:$AMOUNT u64:$AMOUNT 'u8:[0, 3, 1, 0, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 26, 128]' hex:0x00 hex:0x00 "bool:false")
    QUOTE_RESULT=$(echo "$QUOTE_RESULT" | jq -r '.Result[0]')
    echo    "QUOTE_RESULT: $QUOTE_RESULT"
    NATIVE_FEE_HEX=$(echo "$QUOTE_RESULT" | cut -c 1-66)
    NATIVE_FEE=$(cast --to-dec "$NATIVE_FEE_HEX")

    echo "Quoted native fee for $ASSET_NAME: $NATIVE_FEE"

    # Send the tokens
    echo "Sending $ASSET_NAME..."
    # send_withdraw(account: &signer, dst_eid: u32, to: vector<u8>, amount_ld: u64, min_amount_ld: u64, extra_options: vector<u8>, compose_message: vector<u8>, oft_cmd: vector<u8>, native_fee: u64, zro_fee: u64,)
    aptos move run --function-id $TOKEN_ADDRESS::oft::send_withdraw --args u32:$TARGET_EID hex:$RECIPIENT_ADDRESS u64:$AMOUNT u64:$AMOUNT 'u8:[0, 3, 1, 0, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 26, 128]' hex:0x00 hex:0x00 u64:$NATIVE_FEE u64:0 --assume-yes
    echo "$ASSET_NAME processing complete."
}

# Process each asset
# aptos init --network custom --rest-url $RPC_URL --skip-faucet --private-key $PRIVATE_KEY --assume-yes 
process_asset "$USDC_TOKEN" "USDC"
process_asset "$USDT_TOKEN" "USDT"
process_asset "$WETH_TOKEN" "WETH"

echo "All transactions completed."
