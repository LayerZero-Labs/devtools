

# We'll setup an empty testing directory for this script and store its location in this variable
PROJECTS_DIRECTORY=

# This will be run at the start of this testing suite,
# similar to beforeAll() in jest
setup() {
    # Load bats-assert and bats-support
    load "../lib/bats-support/load.bash"
    load "../lib/bats-assert/load.bash"

    # For debugging purposes, we'll output the environment variables 
    # that influence the behavior of create-lz-oapp
    echo "create-lz-oapp:repository   $LAYERZERO_EXAMPLES_REPOSITORY_URL" 1>&2
    echo "create-lz-oapp:ref          $LAYERZERO_EXAMPLES_REPOSITORY_REF" 1>&2

    # Setup a directory for all the projects created by this test
    PROJECTS_DIRECTORY=$(mktemp -d)

    # Install the binary so that we avoid race conditions
    flock --verbose bats.lock npm install -g create-lz-oapp
}

teardown() {
    rm -rf "$PROJECTS_DIRECTORY"
}

@test "should output version" {
    npx --yes create-lz-oapp --version
}

@test "should fail if --destination is missing in CI mode" {
    run npx --yes create-lz-oapp --ci --example oft

    assert_failure
    assert_output --partial "Missing argument: --destination must be specified in CI mode"
}

@test "should fail if --destination directory already exists in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/existing"
    mkdir -p "$DESTINATION"

    run npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION

    assert_failure
    assert_output --regexp "Directory '.*?' already exists"
}

@test "should fail if --destination is an existing file in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/file.json"
    touch $DESTINATION

    run npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION
    assert_failure
    assert_output --regexp "File '.*?' already exists"
}

@test "should fail if --example is missing in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/unused"

    run npx --yes create-lz-oapp --ci --destination $DESTINATION

    assert_failure
    assert_output --partial "Missing argument: --example must be specified in CI mode"
    assert [ ! -d $DESTINATION ]
}

@test "should fail if --example is not valid in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/unused"

    run npx --yes create-lz-oapp --ci --destination $DESTINATION --example wat

    assert_failure
    assert [ ! -d $DESTINATION ]
}

@test "should fail if --package-manager is not valid in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/unused"

    run npx --yes create-lz-oapp --ci --destination $DESTINATION --example oft --package-manager wroom

    assert_failure
    assert_output --partial "manager wroom not found"
    assert [ ! -d $DESTINATION ]
}

# This test is a bit ridiculous because it basically checks that we error out
# on the fact that we have insufficient funds, not on the fact that the EndpointV2 deployment cannot be found
@test "should find EndpointV2 deployment for oapp in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oapp"
    local MNEMONIC="test test test test test test test test test test test junk"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"

    MNEMONIC=$MNEMONIC run pnpm hardhat lz:deploy --ci
    refute_output --partial "No deployment found for: EndpointV2"

    MNEMONIC=$MNEMONIC run pnpm hardhat deploy --network sepolia
    refute_output --partial "No deployment found for: EndpointV2"
}

# This test is a bit ridiculous because it basically checks that we error out
# on the fact that we have insufficient funds, not on the fact that the EndpointV2 deployment cannot be found
@test "should find EndpointV2 deployment for oft in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft"
    local MNEMONIC="test test test test test test test test test test test junk"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"

    MNEMONIC=$MNEMONIC run pnpm hardhat lz:deploy --ci
    refute_output --partial "No deployment found for: EndpointV2"

    MNEMONIC=$MNEMONIC run pnpm hardhat deploy --network sepolia
    refute_output --partial "No deployment found for: EndpointV2"
}

@test "should work with pnpm & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oapp"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
    pnpm lint
    pnpm lint:fix
}

@test "should work with pnpm & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
    pnpm lint
    pnpm lint:fix
}

@test "should work with pnpm & onft721 example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-onft721"

    npx --yes create-lz-oapp --ci --example onft721 --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
    pnpm lint
    pnpm lint:fix
}

@test "should work with pnpm & oft-adapter example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft-adapter"

    npx --yes create-lz-oapp --ci --example oft-adapter --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
    pnpm lint
    pnpm lint:fix
}

@test "should work with pnpm & oft solana example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft-solana"

    LZ_ENABLE_EXPERIMENTAL_SOLANA_OFT_EXAMPLE=1 npx --yes create-lz-oapp --ci --example oft-solana --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
}

@test "should work with yarn & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oapp"

    YARN_CACHE_FOLDER="/tmp/.yarn-cache" npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
    yarn lint
    yarn lint:fix
}

@test "should work with yarn & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oft"

    YARN_CACHE_FOLDER="/tmp/.yarn-cache-oft-evm" npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
    yarn lint
    yarn lint:fix
}

@test "should work with yarn & onft721 example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oapp"

    YARN_CACHE_FOLDER="/tmp/.yarn-cache-onft-evm" npx --yes create-lz-oapp --ci --example onft721 --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
    yarn lint
    yarn lint:fix
}

@test "should work with yarn & oft-adapter example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oapp"

    YARN_CACHE_FOLDER="/tmp/.yarn-cache-oft-adapter-evm" npx --yes create-lz-oapp --ci --example oft-adapter --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
    yarn lint
    yarn lint:fix
}

@test "should work with yarn & oft solana example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oft-solana"

    YARN_CACHE_FOLDER="/tmp/.yarn-cache-oft-solana" LZ_ENABLE_EXPERIMENTAL_SOLANA_OFT_EXAMPLE=1 npx --yes create-lz-oapp --ci --example oft-solana --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
}

@test "should work with npm & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oapp"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
    npm run lint
    npm run lint:fix
}

@test "should work with npm & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oft"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
    npm run lint
    npm run lint:fix
}

@test "should work with npm & onft721 example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oft"

    npx --yes create-lz-oapp --ci --example onft721 --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
    npm run lint
    npm run lint:fix
}

@test "should work with npm & oft-adapter example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oft"

    npx --yes create-lz-oapp --ci --example oft-adapter --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
    npm run lint
    npm run lint:fix
}

@test "should work with npm & oft solana example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oft-solana"

    LZ_ENABLE_EXPERIMENTAL_SOLANA_OFT_EXAMPLE=1 npx --yes create-lz-oapp --ci --example oft-solana --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
}
