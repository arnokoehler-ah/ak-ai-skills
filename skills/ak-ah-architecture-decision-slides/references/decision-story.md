# Architecture decisions for MT, CTO and C-level

## Start from the decision

State what the audience is asked to approve: analysis capacity, a direction, a bounded pilot, a budget or rollout. Name the owner and decision moment when supplied. A recommendation and a request for mandate are different things.

Use this causal chain:

1. Business ambition or obligation.
2. Observable limitation in the current operating model.
3. Consequence for customers, delivery, capacity, risk or cost.
4. Options, including continuing as today or making a smaller change.
5. Recommended direction, trade-offs and what would invalidate it.
6. A staged transition, evidence gates and the specific decision now.

Evidence, assumptions and unknowns remain visible. Source material may establish a claim without proving it independently: cite it as a source claim. Quantify the cost of inaction only when the inputs exist. Do not turn a fictional example, target latency or scenario amount into measured performance or promised ROI.

## Audience and views

| Audience question | Useful view |
|---|---|
| Why should this matter to us? | Constraint → consequence → business choice |
| What changes for the operation? | Before/after at the same abstraction level |
| Where are the system boundaries? | C4 context, with explicit scope |
| How does the proposed arrangement help? | One concrete dynamic interaction |
| What will it cost or make harder? | Comparable alternatives and trade-offs |
| What exactly are we approving? | Bounded mandate, owner, evidence gate and next decision |

MT/C-level usually needs a concise main story, with deeper diagrams available for questions. A CTO may want the concrete request, response, constraints, retry/failure behavior and ownership. Keep the shared model stable when zooming in.

## Diagram clarity

- Put responsibility in the box; put a meaningful action or payload on the arrow.
- Keep names and positions stable across focused slides and click steps.
- Reveal one causal moment at a time. Keep the final complete view useful as a handout.
- If several replies jointly constrain the outcome, show a small aligned table rather than many overlapping speech bubbles.
- A capability is not automatically a software system; a software system is not automatically a deployable container. Use the term the source can support.
- Show open decisions as open. Source dates and evidence status should not imply current program status.

## Options and transitions

Compare the same concerns for every option: user value, reliability, effort, ongoing operation, dependencies and reversibility. Explicitly include the baseline. A stronger architecture can also introduce extra operational burden; say so. Prefer evidence gates and incremental commitments to a single all-or-nothing target picture.

## Review before delivery

Can an executive state the decision after one pass? Can the architect trace every arrow to a real responsibility or an explicitly proposed one? Are assumptions visible? Is every quantitative claim attributable? Does the final click show the same complete information as the static handout? Those checks matter more than decorative density.
