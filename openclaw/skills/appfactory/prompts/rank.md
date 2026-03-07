# Rank Prompt

Score all active ideas on these weighted dimensions:

| Dimension | Weight | Question to answer |
|-----------|--------|--------------------|
| Pain (P) | 3x | Would someone pay to make this problem go away today? |
| Market (M) | 2x | Are there >10k people with this problem who are reachable online? |
| Buildability (B) | 3x | Can one dev ship a working MVP in under 1 week? |
| Moat (Mo) | 1x | Is there anything (data, network, integration) that slows copycats? |
| Revenue (R) | 2x | Is there a clear path to $1k MRR without a sales team? |
| Virality (V) | 2x | Does usage naturally expose the product to non-users? |

## Scoring

For each idea:
1. Score each dimension 1-10
2. Compute weighted total: `(P*3 + M*2 + B*3 + Mo*1 + R*2 + V*2) / 13`
3. Sort descending by weighted total

## Output Format

```
| Rank | # | Name | Pain | Market | Build | Moat | Revenue | Viral | Score |
|------|---|------|------|--------|-------|------|---------|-------|-------|
| 1 | 3 | ... | 9 | 7 | 8 | 4 | 7 | 6 | 7.2 |
```

After the table, add a 1-2 sentence recommendation: which idea to spec next and why. If any ideas score below 4.0, recommend killing them.
