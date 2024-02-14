import { rmSync } from 'fs';
import * as jestExtended from 'jest-extended';

// add all jest-extended matchers
expect.extend(jestExtended);

// clear all deployments before & after every test
const clearDeployments = () => rmSync('./deployments', { force: true, recursive: true });

// clear all generated files before & after every test
const clearGenerated = () => rmSync('./generated', { force: true, recursive: true });

const clean = () => {
    clearDeployments();
    clearGenerated();
};

beforeEach(clean);
afterEach(clean);
