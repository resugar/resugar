import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import objectsDestructuring from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [objectsDestructuring]);
