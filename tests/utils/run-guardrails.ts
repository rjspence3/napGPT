/**
 * Standalone guardrails runner
 */

import { runGuardrails } from './guardrails';

runGuardrails()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Guardrails check failed:', error);
    process.exit(1);
  });

