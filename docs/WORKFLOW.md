# Contribution Workflow — PR per change

A small, consistent loop: **one logical change → one branch → one PR → merge.**
Keeping PRs small makes review easier, keeps history clean, and (bonus) steadily
grows the GitHub *Pull Shark* and *Pair Extraordinaire* achievements.

## The loop

```bash
# 1. Always start from the latest main
git switch main
git pull origin main

# 2. Branch per change (use a type prefix: feat/ fix/ chore/ docs/ refactor/)
git switch -c feat/short-description

# 3. Make ONE focused change, then commit with a co-author trailer
git add -A
git commit -m "feat: short description

Co-authored-by: Name <email@example.com>"

# 4. Push and open a PR
git push -u origin feat/short-description
gh pr create --base main --fill

# 5. Merge once it's green, then delete the branch
gh pr merge --squash --delete-branch
```

## Why each step matters

- **Branch off `main`** — keeps changes isolated and PRs reviewable in isolation.
- **One change per PR** — smaller diffs review faster and revert cleanly.
- **`Co-authored-by:` trailer** — credits collaborators (and earns *Pair
  Extraordinaire*). Add one line per co-author at the end of the commit body.
- **Squash merge** — one tidy commit lands on `main` per PR.

## Achievement notes

- **Pull Shark** 🦈 — awarded for merged PRs (tiers at 2, 16, 128, 1024).
- **Pair Extraordinaire** 👯 — merged PRs whose commits carry `Co-authored-by:`.
- Both climb automatically if you follow the loop above. Keep PRs *real* — GitHub
  does not count obvious spam (e.g. many empty PRs in a short window).
