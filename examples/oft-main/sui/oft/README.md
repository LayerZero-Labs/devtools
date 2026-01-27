# Sui OFT Package

Populate `sources/` by copying the LayerZero OFT Move sources:

```bash
git clone https://github.com/LayerZero-Labs/LayerZero-v2.git --depth 1
cp -r LayerZero-v2/packages/layerzero-v2/sui/contracts/oapps/oft/oft/sources ./sources
rm -rf LayerZero-v2
```

Then publish the package:

```bash
sui client publish --gas-budget 1000000000 --json > oft_deploy.json
```
