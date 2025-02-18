<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Experimental Functionality</h1>

This document lists the functionality that can be enabled using environment variables.

---

**Please note** that this functionality is marked _experimental_ for a reason and should be used with caution. We welcome feedback and will try to provide support but until the _experimental_ label is removed, we cannot guarantee that this functionality will work for all setups.

---

## Parallel configuration <a id="parallel-configuration"></a>

By default, the RPC calls that check the current state of your contracts are executed in series. For large projects, this process can take some time as the number of connections between `N` contracts is in the order of <code>N<sup>2</sup></code>.

Parallel execution can improve the speed of this process significantly. However, since it requires a large number of RPC calls to be executed simultaneously, it can result in `HTTP 429 Too Many Requests` RPC errors when used with public RPCs.

### To enable

`LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION=1`

### To disable

`LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION=`

## Batched transaction sending <a id="batched-send"></a>

Some signers might support batched transaction sending (e.g. Gnosis Safe signer). If turned on, this feature flag will make use of the batched sending. If this feature flag is on and batched sending is not available, regular sending will be used instead.

If the signer used does not support batch sending, <a href="#batched-wait">batched awaiting</a> feature flag will be used to determine which signing strategy to use.

### To enable

`LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND=1`

### To disable

`LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND=`

## Batched transaction awaiting <a id="batched-wait"></a>

By default, the transactions are submitted and awaited one by one. This means a transaction will only be submitted once the previous transaction has been mined (which results in transactions being mined in consecutive blocks, one transaction per block).

This feature flag changes this behavior and allows all transactions to be submitted first to potentially the same block. Only after all of the transactions have been submitted will the code wait for them to be mined.

**Important** Enabling this behavior can incur higher costs of transaction reverts since a failing transaction can result in more than one revert.

### To enable

`LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT=1`

### To disable

`LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT=`
