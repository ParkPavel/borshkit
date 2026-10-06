import { citationsCheck } from './citations.mjs';
import { attributionCheck, readmeAssetsCheck } from './attribution.mjs';

// Checks Borshkit runs itself, in-process, against the task's copy of the project.
export const BUILTINS = { citations: citationsCheck, attribution: attributionCheck, 'readme-assets': readmeAssetsCheck };
