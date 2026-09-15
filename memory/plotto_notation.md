# Plotto notation — authoritative (from Cook's intro, garykac.github.io/plotto/plotto-mf.html)

## Asterisks (broken conflicts) — page 7 "CONFLICT MANIPULATIONS"
Conflicts are often "broken" into 2+ parts. End of part 1 = star `*`, part 2 = `**`, part 3 = `***`.
- `-*`   = use the conflict UP TO the first star.
- `-**`  = use everything up to the double star.
- `*-**` = use ONLY the part between the first star and the double star (skip part 1).
- `**-***`= use only the part between second and third star.
In our parsed plotto.json these breakpoints became separate `permutations` (perm 1 = pre-star, perm 2 = between stars, etc.).

## Character manipulations
- `ch A-3 to A`  = change A-3 into A (a transform / "character change").
- `tr B & B-3`   = transpose: B-3 takes B's place and B takes B-3's place.
These are stored in link `modifiers` as "change X to Y" (transpose expanded to two changes).

## Structure
- Masterplot = A clause (protagonist) + B clause (originates/carries action) + C clause (terminates).
- Conflicts grouped: Love & Courtship, Married Life, Enterprise; sub-grouped under B-clause headings.
- Numbers PREFIXED to a conflict = lead-ups (Past); numbers AFFIXED = carry-ons (Future).
- `;` separates alternative reference groups; adjacent numbers = a complementary combination (use together).

## Scott's UI rules (this app)
- HIDE all Plotto reference numbers from user-facing Parent/Child option lists — show ordinals 1..N.
- Strip Cook's cross-reference numbers embedded in prose; keep genuine story numbers ($500,000, "9 o'clock").
- Asterisks stay VISIBLE and get explained in the primer.
- Process Steps review = plain English, character symbols spelled out (A-3 = the main male character's rival), no code numbers.
