# Changelog

All notable changes to this project are documented in the `/changelogs` directory.

## Structure

- **`changelogs/unreleased.md`** - Changes in development, not yet released
- **`changelogs/X.Y.Z.md`** - Released version changelogs (e.g., `0.1.0.md`, `0.2.0.md`)

## For Maintainers

See [docs/CHANGELOG_GUIDE.md](docs/CHANGELOG_GUIDE.md) for instructions on how to maintain changelogs.

## Quick Start

**During development:**
Add your changes to `changelogs/unreleased.md`

**When releasing:**
1. Copy `changelogs/unreleased.md` to `changelogs/X.Y.Z.md`
2. Update version and date
3. Clear `changelogs/unreleased.md`
4. Update `mix.exs` version
5. Commit and tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
