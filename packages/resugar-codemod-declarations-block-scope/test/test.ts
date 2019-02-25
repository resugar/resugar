import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import declarationsBlockScope from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [declarationsBlockScope]);
