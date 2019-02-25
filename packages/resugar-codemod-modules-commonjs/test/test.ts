import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import modulesCommonjs from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [modulesCommonjs]);
