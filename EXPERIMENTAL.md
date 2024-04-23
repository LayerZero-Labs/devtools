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

In general, we recommend combining this feature with <a href="#automatic-retries">automatic retries</a>.

### To enable

`LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION=1`

### To disable

`LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION=`

## Automatic retries <a id="automatic-retries"></a>

By default, the RPC calls that check the current state of your contracts are executed without retrying any failed requests. This feature flag enables an exponential backoff retry functionality on the RPC reads.

### To enable

`LZ_ENABLE_EXPERIMENTAL_RETRY=1`

### To disable

`LZ_ENABLE_EXPERIMENTAL_RETRY=`
