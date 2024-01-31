

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

@test "should work with pnpm & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oapp"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
}

@test "should work with pnpm & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager pnpm
    cd "$DESTINATION"
    pnpm compile
    pnpm test
}

@test "should work with yarn & oapp example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oapp"

    npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager yarn
    cd "$DESTINATION"
    yarn compile
    yarn test
}

@test "should work with yarn & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oft"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager yarn
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
}

@test "should work with npm & oft example in CI mode" {
    local DESTINATION="$PROJECTS_DIRECTORY/npm-oft"

    npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager npm
    cd "$DESTINATION"
    npm run compile
    npm run test
}