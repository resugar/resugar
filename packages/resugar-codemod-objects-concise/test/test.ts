import { defineTestSuites } from '@resugar/test-runner';
import { join } from 'path';
import objectsConcise from '../src';

defineTestSuites(join(__dirname, '__fixtures__'), [objectsConcise]);
