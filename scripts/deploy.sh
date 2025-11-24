#!/bin/bash
# Deployment script for Kicka Ettan on Digital Ocean

set -e  # Exit on error

APP_NAME="kicka_ettan"
DEPLOY_USER="deploy"  # Change this to your deployment user
DROPLET_IP="YOUR_DROPLET_IP"  # Change this to your droplet IP
DEPLOY_PATH="/home/$DEPLOY_USER/$APP_NAME"

echo "🚀 Deploying Kicka Ettan to kicka-ettan.se..."

# 1. Create tarball of release
echo "📦 Creating deployment tarball..."
cd _build/prod/rel/kicka_ettan
tar -czf /tmp/kicka_ettan.tar.gz .
cd -

# 2. Copy to server
echo "📤 Uploading to server..."
scp /tmp/kicka_ettan.tar.gz $DEPLOY_USER@$DROPLET_IP:/tmp/

# 3. SSH and deploy
echo "🔧 Installing on server..."
ssh $DEPLOY_USER@$DROPLET_IP << 'ENDSSH'
    set -e
    
    # Stop current service
    sudo systemctl stop kicka_ettan || true
    
    # Extract new release
    cd /home/deploy/kicka_ettan
    rm -rf *
    tar -xzf /tmp/kicka_ettan.tar.gz
    rm /tmp/kicka_ettan.tar.gz
    
    # Start service
    sudo systemctl start kicka_ettan
    sudo systemctl status kicka_ettan
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Visit https://kicka-ettan.se"
