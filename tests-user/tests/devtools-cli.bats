

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
}

teardown() {
    rm -rf "$PROJECTS_DIRECTORY"
}

@test "should output version" {
    npx --yes @layerzerolabs/devtools-cli --version
}

@test "should output help" {
    npx --yes @layerzerolabs/devtools-cli --help
}

@test "should work with pnpm & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oapp"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"

    run npx --yes @layerzerolabs/devtools-cli oapp wire --setup ./imaginary.layerzero.setup.ts --oapp-config ./layerzero.config.ts --dry-run
    assert_output --partial "This command is just a placeholder. Please use @layerzerolabs/toolbox-hardhat package for the time being."
}