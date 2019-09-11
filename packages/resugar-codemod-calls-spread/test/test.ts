import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import callsSpread from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [callsSpread]);
