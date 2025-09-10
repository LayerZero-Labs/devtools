# Hyperliquid Composer Readme

This document is an checklist for anyone deploying to hyperevm (and hypercore).

## Step 0 : Deploy your OFT

| Action | Performed by | Actionable with                                                          | Recommended for           |
| ------ | ------------ | ------------------------------------------------------------------------ | ------------------------- |
| Path 1 | OFT Deployer | `LZ_ENABLE_EXPERIMENTAL_HYPERLIQUID_EXAMPLE=1 npx create-lz-oapp@latest` | HyperCore deployments     |
| Path 2 | OFT Deployer | vanilla oft repo + `npx @layerzerolabs/hyperliquid-composer`             | Only HyperEVM deployments |

### Path 1 - With a new repo

- [ ] Create a new hyperliquid example repo `LZ_ENABLE_EXPERIMENTAL_HYPERLIQUID_EXAMPLE=1 npx create-lz-oapp@latest`
  - This comes with the composer and composer deploy script.
  - Deploy scripts perform block switching operations.
  - Composer can be deployed after the core spot is deployed (Step 4). It will not work until the two are linked.
- Composer has default error handling mentioned [in the docs](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#make-changes-to-the-underlying-oft-if-you-want-to)

### Path 2 - Existing repo with OFT

Block switching is not present in the default oft deploy script.

- [ ] Switch to big block before deploying the oft - `npx @layerzerolabs/hyperliquid-composer set-block --size big --network <testnet/mainnet> --log-level verbose --private-key $PRIVATE_KEY`
- [ ] Deploy the oft
- [ ] Switch to small block after deploying the oft - `npx @layerzerolabs/hyperliquid-composer set-block --size small --network <testnet/mainnet> --log-level verbose --private-key $PRIVATE_KEY`

> ⚠️ If you are only doing HyperEVM you are done. Following is only for HyperCore deployments.

## Step 1 : (optional) Purchase your HyperCore Spot

| Action        | Performed by      | Actionable with                          | Required for |
| ------------- | ----------------- | ---------------------------------------- | ------------ |
| Purchase Spot | CoreSpot Deployer | <https://app.hyperliquid.xyz/deploySpot> | HyperCore    |
| Blocked by    | none              | none                                     | Step 2       |

- [ ] Purchase your HyperCore Spot engaging in the [auction](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-16-purchase-the-ticker)

## Step 2 : Deploy the CoreSpot

| Action          | Performed by      | Actionable with                           | Required for |
| --------------- | ----------------- | ----------------------------------------- | ------------ |
| Deploy CoreSpot | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by      | OFT Deployer      | Step 0                                    | Step 3       |
| Blocked by      | CoreSpot Deployer | Step 1                                    | Step 3       |

- [ ] Deploy the CoreSpot following the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#deploy-the-core-spot)

### Step 2.1 : Create a hypercore deployment file

| Action                           | Performed by      | Actionable with                           | Required for |
| -------------------------------- | ----------------- | ----------------------------------------- | ------------ |
| Create HyperCore Deployment File | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by                       | OFT Deployer      | Step 0                                    | Step 3       |
| Blocked by                       | CoreSpot Deployer | Step 1                                    | Step 2.2     |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-0-purchase-the-ticker)
- [ ] Core spot deployer needs OFT address and deployed transaction hash

### Step 2.1.1 : Enable freeze privilege (Optional)

| Action                  | Performed by      | Actionable with                           | Required for |
| ----------------------- | ----------------- | ----------------------------------------- | ------------ |
| Enable Freeze Privilege | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by              | CoreSpot Deployer | Step 2.1                                  | Step 2.2     |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-16-enablefreezeprivilege-optional)
- [ ] **MUST be done before genesis** if you want freeze capability
- [ ] Enables post-launch user freeze/unfreeze operations
- [ ] Once set, can only be revoked (irreversible)

### Step 2.2 : Set the user genesis

| Action           | Performed by      | Actionable with                           | Required for |
| ---------------- | ----------------- | ----------------------------------------- | ------------ |
| Set User Genesis | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by       | CoreSpot Deployer | Step 2.1                                  | Step 2.3     |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-26-usergenesis)
- [ ] HyperCore balances are u64 - the max balance is `2.pow(64) - 1 = 18446744073709551615`
- [ ] Make sure the total balances in the json does not exceed this value.
- [ ] Re-runnable until the next step is executed.
- [ ] UserGenesis transactions stack : If you set the balance of address X to `18446744073709551615` and then set the balance of address Y to `18446744073709551615` after removing X from the json, the net effect is that both X and Y will have `18446744073709551615` tokens.
- You can either mint the entire amount to the asset bridge address (default) or the deployer address.
- You can read more about the asset bridge address - [in the docs](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#make-changes-to-the-underlying-oft-if-you-want-to)

### Step 2.3 - Confirm the user genesis

| Action               | Performed by      | Actionable with                           | Required for |
| -------------------- | ----------------- | ----------------------------------------- | ------------ |
| Confirm User Genesis | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by           | CoreSpot Deployer | Step 2.2                                  | Step 2.4     |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-36-genesis)
- [ ] Locks in the user genesis step and is now immutable.

### Step 2.4 : Create spot deployment

| Action                | Performed by      | Actionable with                           | Required for |
| --------------------- | ----------------- | ----------------------------------------- | ------------ |
| Create Spot Deployment| CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by            | CoreSpot Deployer | Step 2.3                                  | Step 2.5     |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-46-createspotdeployment)
- Step MUST be run even though we set `noHyperliquidity=true` in genesis
- This can be run even after deployment and linking

### Step 2.5 - Register the spot

| Action        | Performed by      | Actionable with                           | Required for |
| ------------- | ----------------- | ----------------------------------------- | ------------ |
| Register Spot | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by    | CoreSpot Deployer | Step 2.4                                  | Step 3       |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-56-registerspot)
- [ ] Only USDC is supported on HyperCore at the moment - the sdk defaults to USDC.
- [ ] Make sure the asset bridge address on HyperCore has all the tokens minted in Step 2.3. Partial funding is not supported.
- The final step to be executed after which the token will be listed on the spot order book.

### Step 2.6 : Enable quote token capability (Optional)

| Action                     | Performed by      | Actionable with                           | Required for |
| -------------------------- | ----------------- | ----------------------------------------- | ------------ |
| Enable Quote Token         | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by                 | CoreSpot Deployer | Step 2.5                                  | none         |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-66-enablequotetoken-optional)
- [ ] Enables the token to be used as a quote asset for trading pairs
- This can be run even after deployment and linking

### Step 2.7 : Set deployer fee share (Optional)

| Action                 | Performed by      | Actionable with                           | Required for |
| ---------------------- | ----------------- | ----------------------------------------- | ------------ |
| Set Deployer Fee Share | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by             | OFT Deployer      | Step 0                                    | none         |
| Blocked by             | CoreSpot Deployer | Step 2.1                                  | none         |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#optional-setdeployertradingfeeshare)
- [ ] Trading fee share is usually 100% (default value) - this allocates the trading fees to the token deployer instead of burning it.
- [ ] Do not lose or burn your deployer address as it collects tokens.
- [ ] Step can be re-run as long as the new fee% is lower than the current one.
- Even though the default value is 100%, it is recommended that you set it
- This can be run even after deployment and linking

## Step 3.1 : Create a request to connect the HyperCoreSpot to HyperEVM OFT

| Action         | Performed by      | Actionable with                           | Required for |
| -------------- | ----------------- | ----------------------------------------- | ------------ |
| Create Request | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by     | CoreSpot Deployer | Step 0, Step 2                            | Step 3.2     |

- [ ] Make sure the core spot deployer has the oft address.

## Step 3.2 : Accept the request to connect the HyperCoreSpot to HyperEVM OFT

| Action         | Performed by      | Actionable with                           | Required for |
| -------------- | ----------------- | ----------------------------------------- | ------------ |
| Accept Request | OFT Deployer      | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by     | CoreSpot Deployer | Step 3.1                                  | Step 4       |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-0-core-spot-create)
- [ ] Create a deployment file for the core spot before linking.

## Step 4 : Deploy the Composer

| Action          | Performed by      | Actionable with                           | Required for |
| --------------- | ----------------- | ----------------------------------------- | ------------ |
| Deploy Composer | OFT Deployer      | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by      | CoreSpot Deployer | Step 3                                    | none         |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#step-22-finalizeevmcontract)
- Deployer script in the oft repo will deploy the composer - it also handles block switching.
- [ ] Make sure the Composer's address is activated on HyperCore (sending it at least $1 worth of `HYPE` or `USDC`).
- Composer is re-deployable and independent of the oft and does not need to be linked with anything.

## Step 5 : Listing on spot order books

| Action            | Performed by      | Actionable with                           | Required for |
| ----------------- | ----------------- | ----------------------------------------- | ------------ |
| Spot Book Listing | Automatic         | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by        | CoreSpot Deployer | Step 2                                    | none         |

This is automatically completed when all steps in Step 2 are completed.

## Step 6 : Listing on perp order books

| Action            | Performed by      | Actionable with                           | Required for |
| ----------------- | ----------------- | ----------------------------------------- | ------------ |
| Perp Book Listing | Automatic         | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by        | CoreSpot Deployer | Step 2                                    | none         |

This is controlled by the hyperliquid community - [source](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/perpetual-assets)

> Hyperliquid currently supports trading of 100+ assets. Assets are added according to community input.

## Step 7 : Post-Launch Management (Optional)

### Step 7.1 : Freeze/Unfreeze Users

| Action            | Performed by      | Actionable with                           | Required for |
| ----------------- | ----------------- | ----------------------------------------- | ------------ |
| Freeze Users      | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by        | CoreSpot Deployer | Step 2.1.1 (Enable Freeze)               | none         |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#freezeunfreeze-users)
- [ ] Only available if freeze privilege was enabled before genesis
- [ ] Can freeze/unfreeze individual users
- [ ] Updates deployment JSON with blacklist status

### Step 7.2 : Revoke Freeze Privilege

| Action                 | Performed by      | Actionable with                           | Required for |
| ---------------------- | ----------------- | ----------------------------------------- | ------------ |
| Revoke Freeze          | CoreSpot Deployer | `npx @layerzerolabs/hyperliquid-composer` | HyperCore    |
| Blocked by             | CoreSpot Deployer | Step 2.1.1 (Enable Freeze)               | none         |

- [ ] Follow the [guide](https://github.com/LayerZero-Labs/devtools/blob/main/examples/oft-hyperliquid/HYPERLIQUID.README.md#revoke-freeze-privilege)
- [ ] **Permanently removes freeze capability (irreversible)**
- [ ] No longer able to freeze/unfreeze any users
- [ ] Use with caution - cannot be undone
