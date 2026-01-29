# 🏗️ Work Not Done Audit: napGPT
**Date:** 2026-01-05

**Summary:** 6 markers, 33 logic gaps/mocks

## 🚨 High Priority (Logic Gaps & Mocks)
| File | Line | Issue | Context |
| :--- | :--- | :--- | :--- |
| `./napGPT/docs/archive/CODE_TEST_REVIEW.md` | 91 | Logic Gap | return null; |
| `./napGPT/jest.setup.ts` | 30 | Mock Data | const seed = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED, 10) : 12345; |
| `./napGPT/playwright-report/index.html` | 18 | Logic Gap | */var o1;function rm(){if(o1)return gi;o1=1;var c=Symbol.for("react.transitional.element"),i=Symbol.for("react.fragment");function u(f,r,o){var d=null;if(o!==void 0&&(d=""+o),r.key!==void 0&&(d=""+r.k... |
| `./napGPT/playwright-report/index.html` | 26 | Logic Gap | */var u2;function s5(){if(u2)return ht;u2=1;var c=Symbol.for("react.transitional.element"),i=Symbol.for("react.portal"),u=Symbol.for("react.fragment"),f=Symbol.for("react.strict_mode"),r=Symbol.for("r... |
| `./napGPT/playwright-report/index.html` | 34 | Logic Gap | */var s2;function f5(){return s2\|\|(s2=1,(function(c){function i(j,_){var $=j.length;j.push(_);t:for(;0<$;){var dt=$-1>>>1,b=j[dt];if(0<r(b,_))j[dt]=_,j[$]=b,$=dt;else break t}}function u(j){return j.l... |
| `./napGPT/playwright-report/index.html` | 50 | Logic Gap | */var d2;function h5(){if(d2)return vi;d2=1;var c=r5(),i=rr(),u=d5();function f(t){var e="https://react.dev/errors/"+t;if(1<arguments.length){e+="?args[]="+encodeURIComponent(arguments[1]);for(var n=2... |
| `./napGPT/playwright-report/index.html` | 52 | Logic Gap | `+hc+t+jr}var gc=!1;function Ac(t,e){if(!t\|\|gc)return"";gc=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var a={DetermineComponentFrameRoot:function(){try{if(e){var k=function(){... |
| `./napGPT/playwright-report/index.html` | 57 | Logic Gap | `+n.stack}}function we(t){switch(typeof t){case"bigint":case"boolean":case"number":case"string":case"undefined":return t;case"object":return t;default:return""}}function Nr(t){var e=t.type;return(t=t.... |
| `./napGPT/playwright-report/index.html` | 58 | Logic Gap | `).replace(DA,"")}function Ld(t,e){return e=Yd(e),Yd(t)===e}function Mu(){}function Rt(t,e,n,a,l,s){switch(n){case"children":typeof a=="string"?e==="body"\|\|e==="textarea"&&a===""\|\|Na(t,a):(typeof a=="... |
| `./napGPT/playwright-report/index.html` | 76 | Logic Gap | `)[0];if(!(!u.includes("toHaveScreenshot")&&!u.includes("toMatchSnapshot")))return i.find(f=>c.includes(f.name))}const Gh=({test:c,step:i,result:u,depth:f})=>A.jsx(P5,{title:A.jsxs("span",{"aria-label... |
| `./napGPT/playwright-report/index.html` | 18 | Mock Data | */var o1;function rm(){if(o1)return gi;o1=1;var c=Symbol.for("react.transitional.element"),i=Symbol.for("react.fragment");function u(f,r,o){var d=null;if(o!==void 0&&(d=""+o),r.key!==void 0&&(d=""+r.k... |
| `./napGPT/scripts/mcp/scenarios/00_smoke.ts` | 67 | Logic Gap | return null; |
| `./napGPT/scripts/mcp/scenarios/00_smoke.ts` | 136 | Logic Gap | return null; |
| `./napGPT/scripts/mcp/scenarios/100_ui_interactions.ts` | 52 | Logic Gap | if (!userMsg \|\| !assistantMsg) return null; |
| `./napGPT/scripts/mcp/scenarios/100_ui_interactions.ts` | 110 | Logic Gap | if (!container) return null; |
| `./napGPT/scripts/mcp/scenarios/10_effort_bands.ts` | 73 | Logic Gap | return null; |
| `./napGPT/scripts/mcp/scenarios/70_error_and_retry.ts` | 115 | Logic Gap | return null; |
| `./napGPT/scripts/mcp/utils/artifacts.ts` | 134 | Logic Gap | return null; |
| `./napGPT/scripts/mcp/utils/visual.ts` | 86 | Logic Gap | return null; |
| `./napGPT/scripts/ui-test/budget-gate.ts` | 35 | Logic Gap | return null; |
| `./napGPT/scripts/ui-test/lighthouse.ts` | 40 | Logic Gap | return null; |
| `./napGPT/scripts/ui-test/lighthouse.ts` | 66 | Logic Gap | // Lighthouse may fail in some environments, return null instead of throwing |
| `./napGPT/scripts/ui-test/lighthouse.ts` | 68 | Logic Gap | return null; |
| `./napGPT/src/components/ChatWindow.tsx` | 123 | Logic Gap | return null; |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 20 | Mock Data | setSeed(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 23 | Mock Data | setSeed(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 30 | Mock Data | setSeed(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 57 | Mock Data | setSeed(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 58 | Mock Data | expect(getSeed()).toBe(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 65 | Mock Data | setSeed(12345); |
| `./napGPT/src/lib/utils/__tests__/testRandom.test.ts` | 68 | Mock Data | setSeed(12345); |
| `./napGPT/tests/utils/screen.ts` | 49 | Logic Gap | if (!element) return null; |
| `./napGPT/tests/utils/screen.ts` | 52 | Logic Gap | if (!box) return null; |

## 📝 Markers (TODOs/FIXMEs)
- `./napGPT/docs/archive/TEST_STATUS.md:47` : "- **Status:** ⏳ PENDING"
- `./napGPT/docs/archive/TEST_STATUS.md:53` : "- **Status:** ⏳ PENDING"
- `./napGPT/docs/archive/TEST_STATUS.md:58` : "- **Status:** ⏳ PENDING"
- `./napGPT/docs/internal/TODO.md:1` : "# napGPT TODO"
- `./napGPT/playwright-report/index.html:58` : "').replace(DA,"")}function Ld(t,e){return e=Yd(e),Yd(t)===e}function Mu(){}function Rt(t,e,n,a,l,s){switch(n){case"children":typeof a=="string"?e==="body"||e==="textarea"&&a===""||Na(t,a):(typeof a=="..."
- `./napGPT/src/lib/llm/adapter.ts:47` : "// TODO: Add Anthropic support"
