# Changelog Guide

This guide explains how to maintain changelogs for this project.

## File Structure

All changelogs are stored in the `/changelogs` directory:

```
/changelogs
  ├── unreleased.md      # Current changes not yet released
  ├── 0.1.0.md           # Released version changelogs
  ├── 0.2.0.md
  └── TEMPLATE.md        # Template for new changelogs
```

## When to Update

Update `changelogs/unreleased.md` whenever you:
- Add a new feature
- Fix a bug
- Change existing functionality
- Remove something

## Format

Each changelog file uses this structure:

```markdown
# Version X.Y.Z
Released: YYYY-MM-DD

## Added
- New features users can see and use

## Changed
- Improvements to existing features
- Behavior changes users will notice

## Fixed
- Bug fixes that improve the experience

## Removed
- Features that were taken away
```

## Writing Good Entries

**Focus on the player experience:**
- ✅ "Added ability to undo stone placement"
- ✅ "Fixed stones disappearing when zooming out"
- ✅ "Improved visibility of the scoring zones"
- ❌ "Refactored CSS variables" (players don't care)
- ❌ "Updated dependencies" (not user-facing)

**Be clear and concise:**
- Use simple language
- One line per change
- Start with a verb (Added, Fixed, Changed, Improved)
- Describe what changed, not how it was implemented

**Order matters:**
- Most important changes first
- Group similar changes together

## Workflow

### During Development

Add changes to `changelogs/unreleased.md` as you work:

```markdown
# Unreleased

Changes that will be in the next release.

## Added
- New lobby chat feature

## Fixed
- Scoring not updating correctly at end of round
```

### When Releasing a New Version

1. Copy `changelogs/unreleased.md` to `changelogs/X.Y.Z.md`
2. Update the version number and add the release date
3. Clear out `changelogs/unreleased.md` (keep the structure, remove the items)
4. Update the version number in `mix.exs`
5. Commit and create a git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`

### Example Release Process

```bash
# 1. Copy unreleased to new version
cp changelogs/unreleased.md changelogs/0.2.0.md

# 2. Edit the new file (update version and date)
# Change "# Unreleased" to "# Version 0.2.0"
# Add "Released: 2025-12-20"

# 3. Clear unreleased.md (keep structure, remove items)

# 4. Update mix.exs version

# 5. Commit and tag
git add .
git commit -m "Release v0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main --tags
```

## Example Changelog

```markdown
# Version 0.2.0
Released: 2025-12-20

## Added
- Chat system in game lobby
- Sound effects for stone placement
- Ability to rematch after game ends

## Changed
- Improved touch controls on mobile devices
- Updated color scheme for better contrast

## Fixed
- Game freezing when last player disconnects
- Incorrect score display in final round
```

## Rendering on Website

The frontend can read all markdown files from `/changelogs`:
- Parse markdown to HTML
- Display in reverse chronological order
- Show `unreleased.md` at the top if it has content
