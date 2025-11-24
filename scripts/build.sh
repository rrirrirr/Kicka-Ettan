#!/bin/bash
# Build script for Kicka Ettan

set -e  # Exit on error

echo "🏗️  Building Kicka Ettan..."

# 1. Build frontend assets
echo "📦 Building frontend assets..."
cd assets
npm install
npm run build
cd ..

# 2. Get production dependencies
echo "📚 Getting production dependencies..."
MIX_ENV=prod mix deps.get --only prod

# 3. Compile
echo "⚙️  Compiling..."
MIX_ENV=prod mix compile

# 4. Deploy assets (digest and compress)
echo "🎨 Deploying assets..."
MIX_ENV=prod mix assets.deploy

# 5. Create release
echo "📋 Creating release..."
MIX_ENV=prod mix release

echo "✅ Build complete!"
echo "📦 Release created in _build/prod/rel/kicka_ettan/"
