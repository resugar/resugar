import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import functionsArrow from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [functionsArrow]);
