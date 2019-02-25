import { join } from 'path';
import { defineTestSuites } from '@resugar/test-runner';
import objectsShorthand from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [objectsShorthand]);
