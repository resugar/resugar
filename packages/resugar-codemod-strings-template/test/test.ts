import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import stringsTemplate from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [stringsTemplate]);
