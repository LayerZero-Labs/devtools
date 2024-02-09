import { rmSync } from 'fs';
import * as jestExtended from 'jest-extended';

// add all jest-extended matchers
expect.extend(jestExtended);

// clear all deployments before & after every test
const clearDeployments = () => rmSync('./deployments', { force: true, recursive: true });

beforeEach(clearDeployments);
afterEach(clearDeployments);
