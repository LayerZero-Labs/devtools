<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/ua-utils</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-utils"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/ua-utils"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-utils"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/ua-utils"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ua-utils"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/ua-utils"/></a>
</p>

## Installation

```bash
yarn add @layerzerolabs/ua-utils

pnpm add @layerzerolabs/ua-utils

npm install @layerzerolabs/ua-utils
```

## Usage

### `createProperty`

Creates a `Property` object - an abstract wrapper around a getter and setter of a (typically contract) property.

`Property` objects can be evaluated - this evaluation results in a `PropertyState` object which comes in two varieties:

-   `Configured` object represents a property whose desired value matches the current, actual value
-   `Misconfigured` object represents a property whose desired value does not match the current value. It can be further executed using its `configure` method to set the desired property value

```typescript
import type { Contract } from "@etherspropject/contracts"
import { createProperty, isMisconfigured } from "@layerzerolabs/ua-utils"

// In this example we'll creating a property that is executed within a context of a contract
//
// What this means is that the property requires a contract to be evaluated. This context
// is then passed to the getter, setter and the desired value getter
const myContractProperty = createProperty({
    get: (contract: Contract) => contract.getFavouriteAddress(),
    set: (contract: Contract, favouriteAddress: string) => contract.setFavouriteAddress(favouriteAddress),
    desired: (contract: Contract) => "0x00000000219ab540356cbb839cbe05303d7705fa",
})

// Let's pretend we have a contract at hand
declare const myContract: Contract

// We'll evaluate this property by passing myContract in. This contract will then be passed
// to the getter, setter and desired value getter
//
// The result of this evaluation is a PropertyState object
const state = await myContractProperty(myContract)

// This package comes with two type narrowing utilities for working with PropertyState objects:
//
// - isConfigured
// - isMisconfigured
//
// Using these we can discern between the two varieties of PropertyState
if (isMisconfigured(state)) {
    await state.configure()
}
```

In the example above we used a simple `Contract` object as our context. We can use arbitrary context as the following example shows:

```typescript
import { createProperty, isMisconfigured } from "@layerzerolabs/ua-utils"

const myContractPropertyWithParams = createProperty({
    get: (contract: Contract, when: number, where: string) => contract.getFavouriteAddress(when, where),
    set: (contract: Contract, when: number, where: string, favouriteAddress: string) =>
        contract.setFavouriteAddress(when, where, favouriteAddress),
    desired: (contract: Contract, when: number, where: string) => "0x00000000219ab540356cbb839cbe05303d7705fa",
})

// We'll again pretend we have a contract at hand
declare const myContract: Contract
const when = Date.now()
const where = "Antractica"

// We'll evaluate this property by passing the required context in - in this case
// the context consists of a contract, a numeric value and a string value
//
// The result of this evaluation is a PropertyState object
const state = await myContractPropertyWithParams(myContract, when, where)

// The execution goes just like before
if (isMisconfigured(state)) {
    await state.configure()
}
```

The `createProperty` is completely abstract though and does not require us to get a single contract property or set it directly. in the following, completely made-up example we'll get multiple properties at once and instead of setting them, we'll just populate the transactions for further executions:

```typescript
import { createProperty, isMisconfigured } from "@layerzerolabs/ua-utils"

const myContractPropertyWithParams = createProperty({
    get: (contract: Contract) => Promise.all([contract.getA(), contract.getB()]),
    set: (contract: Contract, [a, b, c]) => [
        contract.pupulateTransaction.setA(a),
        contract.pupulateTransaction.setB(b),
        contract.pupulateTransaction.setC(c),
    ],
    desired: (contract: Contract) => [7, 11, 17],
})

// We'll again pretend we have a contract at hand
declare const myContract: Contract

// We'll evaluate this property by passing the required context in - in this case
// the context consists of a contract, a numeric value and a string value
//
// The result of this evaluation is a PropertyState object
const state = await myContractPropertyWithParams(myContract, when, where)

// The execution goes just like before
if (isMisconfigured(state)) {
    const transactions = await state.configure()

    // We now have a list of populated transactions to execute
}
```

### `isConfigured`

Helper type assertion utility that narrows down the `PropertyState` type to `Configured`:

```typescript
import { PropertyState, isConfigured } from "@layerzerolabs/ua-utils"

declare const state: PropertyState

if (isConfigured(state)) {
    // state is now Configured, no action is needed as the property is in its desired state
}
```

### `isMisconfigured`

Helper type assertion utility that narrows down the `PropertyState` type to `Misconfigured`:

```typescript
import { PropertyState, isMisconfigured } from "@layerzerolabs/ua-utils"

declare const state: PropertyState

if (isMisconfigured(state)) {
    // state is now Misconfigured, we can e.g. call .configure
}
```
