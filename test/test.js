import { readdirSync } from 'fs';
import { checkExamples } from './support/check';

readdirSync('test/form').forEach(name => checkExamples(name));
