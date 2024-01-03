// Since tsup would drop all the type imports, we would lose the type extensions
// from @layerzerolabs/devtools-evm-hardhat
//
// To fix this, we will create a d.ts file instead of having one created during the build
import '@layerzerolabs/devtools-evm-hardhat/type-extensions'
