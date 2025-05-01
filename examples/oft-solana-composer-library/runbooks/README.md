# oft-solana-composer-library Runbooks

[![Txtx](https://img.shields.io/badge/Operated%20with-Txtx-gree?labelColor=gray)](https://txtx.sh)

## Runbooks available

### deployment
Deploy programs

## Getting Started

This repository is using [txtx](https://txtx.sh) for handling its on-chain operations.

`txtx` takes its inspiration from a battle tested devops best practice named `infrastructure as code`, that have transformed cloud architectures. 

`txtx` simplifies and streamlines Smart Contract Infrastructure management across blockchains, focusing on robustness, reproducibility and composability.

### Installation

```console
$ curl -sL https://install.txtx.sh/ | bash
```

### Scaffold a new runbook

```console
$ txtx new
```

Access tutorials and documentation at [docs.txtx.sh](https://docs.txtx.sh) to understand the syntax and discover the powerful features of txtx. 

Additionally, the [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=txtx.txtx) will make writing runbooks easier.

### List runbooks available in this repository
```console
$ txtx ls
Name                ID               Description
BNS Multisig        bns-multisig     Register a BNS name using a multisig signer
```

### Execute an existing runbook
```console
$ txtx run bns-multisig
```

### Update the README documentation
```console
$ txtx docs --update 
```
