#!/bin/bash
# Deployment script for Kicka Ettan on Digital Ocean

set -e  # Exit on error

APP_NAME="${1:-kicka_ettan}"
SERVICE_NAME="${2:-kicka_ettan}"
DEPLOY_USER="deploy"
DROPLET_IP="YOUR_DROPLET_IP" 
DEPLOY_PATH="/home/$DEPLOY_USER/$APP_NAME"
TAR_NAME="${APP_NAME}.tar.gz"

echo "🚀 Deploying $APP_NAME ($SERVICE_NAME) to kicka-ettan.se..."

# 1. Create tarball of release
echo "📦 Creating deployment tarball..."
# Check if release exists
if [ -d "_build/prod/rel/kicka_ettan" ]; then
    cd _build/prod/rel/kicka_ettan
    tar -czf "/tmp/$TAR_NAME" .
    cd -
else
    echo "❌ Release not found in _build/prod/rel/kicka_ettan. Run build.sh first."
    exit 1
fi

# 2. Copy to server
echo "📤 Uploading to server..."
scp "/tmp/$TAR_NAME" $DEPLOY_USER@$DROPLET_IP:/tmp/

# 3. SSH and deploy
echo "🔧 Installing on server..."
ssh $DEPLOY_USER@$DROPLET_IP << ENDSSH
    set -e
    
    # Stop current service
    sudo systemctl stop $SERVICE_NAME || true
    
    # Ensure directory exists
    mkdir -p /home/$DEPLOY_USER/$APP_NAME
    
    # Extract new release
    cd /home/$DEPLOY_USER/$APP_NAME
    # Remove old release files (careful not to remove uploads if stored here)
    rm -rf bin lib releases erts-*
    
    tar -xzf /tmp/$TAR_NAME
    rm /tmp/$TAR_NAME
    
    # Start service
    sudo systemctl start $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME
ENDSSH

echo "✅ Deployment complete!"
