# ONFT721 Standard

The ONFT721 standard is a LayerZero standard for sending IERC721 tokens between LayerZero chains. It is designed to be
compatible with existing ERC721 tokens through the use of ONFT721Adapter.

## Cost of sending tokens

Any LayerZero message requires a base amount of gas, even if no ONFT721 tokens are transferred. Additionally, the cost
of delivering ONFT721s to a remote chain is linear to the number of tokens. Providing a good estimation of the cost of
the transfer will avoid StoredPayloads, and also avoid overcharging the end user.

As such, we derive that the cost is:

```text
y = mx + b
```

### Determining m (the slope)

The slope is the average cost of sending a token to the particular destination chain.

Use `setCost(...)` to set the slope.

### Determining b (the y-intercept)

The y-intercept is the average cost to deliver a message to the destination chain, regardless of the number of tokens
transferred.

Use `setCost(...)` to set the y-intercept.

### Values that we use in tests

- m = 3e4
- b = 4e4

These will vary depending on the destination blockchain.

## \_debit(...) and \_credit(...) now take an array

Iteration over the array of tokenIds is moved from `send(...)` and `lzReceive(...)` to `_debit(...)` and `_credit(...)`
respectively. This saves 400+ units of gas over the previous implementation. Additionally, the API is more symmetrical
to ONFT1155 `_debit(...)` and `_credit(...)`, which take an array of tokenIds.

## Max Number of Tokens to Send

The maximum number of tokens that can be sent in a single transaction is dependent on the EndpointV2 configuration for
the particular destination LayerZero Endpoint ID. Different chains support different maximum payload sizes. The
dynamic portions of the ONFT721 payload include:

- options: The options for the transfer.
- tokenIds: The array of tokens to transfer.
- composeMsg: An optional composition message, which is variable in length depending on the particular application.

As such, the max number of tokens becomes a calculation. To be safe, we suggest limiting to ?
