/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 15000,
  moduleNameMapper: {
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
  },
  transform: {
    // ts-jest does not yet work great with node16 module resolution
    // so we need to help it a little
    //
    // See https://github.com/kulshekhar/ts-jest/issues/4207 for the issue
    // And https://github.com/kulshekhar/ts-jest/issues/4198 for another one
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
