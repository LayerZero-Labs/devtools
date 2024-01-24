#!/bin/bash

# We'll setup an empty testing directory for this script and store its location in this variable
PROJECTS_DIRECTORY=

function set_up_before_script() {
    # For debugging purposes, we'll output the environment variables 
    # that influence the behavior of create-lz-oapp
    echo "create-lz-oapp:repository   $LAYERZERO_EXAMPLES_REPOSITORY_URL" 1>&2
    echo "create-lz-oapp:ref          $LAYERZERO_EXAMPLES_REPOSITORY_REF" 1>&2

    PROJECTS_DIRECTORY=$(mktemp -d)
}

function tear_down_after_script() {
    rm -rf "$PROJECTS_DIRECTORY"
}

function test_should_output_version() {
    assert_successful_code "$(npx --yes create-lz-oapp --version)"
}

function test_should_fail_if_destination_missing_in_ci_mode() {
    assert_general_error "$(npx --yes create-lz-oapp --ci --example oft)"
}

function test_should_fail_if_example_missing_in_ci_mode() {
    DESTINATION="$PROJECTS_DIRECTORY/unused"
    
    assert_directory_not_exists "$DESTINATION"
    assert_general_error "$(npx --yes create-lz-oapp --ci --destination $DESTINATION)"
    assert_directory_not_exists "$DESTINATION"
}

function test_should_fail_if_destination_exists_in_ci_mode() {
    local DESTINATION="$(mktemp -d -p $PROJECTS_DIRECTORY)"
    
    assert_directory_exists "$DESTINATION"
    assert_general_error "$(npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION)"
}

function test_should_fail_if_example_does_not_exists_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/unused"
    
    assert_directory_not_exists "$DESTINATION"
    assert_general_error "$(npx --yes create-lz-oapp --ci --example what --destination $DESTINATION)"
}

function test_should_fail_if_package_manager_does_not_exists_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/unused"
    
    assert_directory_not_exists "$DESTINATION"
    assert_general_error "$(npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager wroom)"
}

function test_should_succeed_with_pnpm_and_oapp_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oapp"
    
    assert_directory_not_exists "$DESTINATION"
    assert_successful_code "$(npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager pnpm)"

    assert_directory_exists "$DESTINATION"
    cd "$DESTINATION"

    assert_successful_code "$(pnpm compile)"
    assert_successful_code "$(pnpm test)"
}

function test_should_succeed_with_pnpm_and_oft_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/pnpm-oft"
    
    assert_directory_not_exists "$DESTINATION"
    assert_successful_code "$(npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager pnpm)"

    assert_directory_exists "$DESTINATION"
    cd "$DESTINATION"

    assert_successful_code "$(pnpm compile)"
    assert_successful_code "$(pnpm test)"
}

function test_should_succeed_with_yarn_and_oapp_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oapp"
    
    assert_directory_not_exists "$DESTINATION"
    assert_successful_code "$(npx --yes create-lz-oapp --ci --example oapp --destination $DESTINATION --package-manager yarn)"

    assert_directory_exists "$DESTINATION"
    cd "$DESTINATION"

    assert_successful_code "$(yarn compile)"
    assert_successful_code "$(yarn test)"
}

function test_should_succeed_with_yarn_and_oft_in_ci_mode() {
    local DESTINATION="$PROJECTS_DIRECTORY/yarn-oft"
    
    assert_directory_not_exists "$DESTINATION"
    assert_successful_code "$(npx --yes create-lz-oapp --ci --example oft --destination $DESTINATION --package-manager yarn)"

    assert_directory_exists "$DESTINATION"
    cd "$DESTINATION"

    assert_successful_code "$(yarn compile)"
    assert_successful_code "$(yarn test)"
}