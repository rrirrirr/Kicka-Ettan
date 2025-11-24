# GitHub Actions Auto-Deploy Setup

## 🚀 How It Works

When you push to the `main` branch, GitHub Actions will automatically:
1. Build the frontend (React + Vite)
2. Compile the backend (Elixir + Phoenix)
3. Create a production release
4. Deploy to your Digital Ocean droplet
5. Restart the application

## 🔐 Setup GitHub Secrets

You need to add these secrets to your GitHub repository:

### Settings → Secrets and variables → Actions → New repository secret

1. **DROPLET_IP** 
   - Your Digital Ocean droplet's IP address
   - Example: `192.168.1.100`

2. **DEPLOY_USER**
   - SSH user for deployment (usually `deploy`)
   - Example: `deploy`

3. **SSH_PRIVATE_KEY**
   - Your SSH private key for authentication
   - Generate if you don't have one:
   ```bash
   # On your local machine
   ssh-keygen -t ed25519 -C "github-actions-kicka-ettan"
   # Save as: ~/.ssh/kicka_ettan_deploy
   
   # Copy PUBLIC key to droplet
   ssh-copy-id -i ~/.ssh/kicka_ettan_deploy.pub deploy@YOUR_DROPLET_IP
   
   # Copy PRIVATE key content and paste into GitHub secret
   cat ~/.ssh/kicka_ettan_deploy
   ```

## 📝 How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `DROPLET_IP` | Value: your droplet IP
   - Name: `DEPLOY_USER` | Value: `deploy`
   - Name: `SSH_PRIVATE_KEY` | Value: your private key content

## ✅ Testing the Workflow

After adding secrets:

```bash
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger auto-deploy"
git push origin main
```

Then:
1. Go to **Actions** tab in GitHub
2. Watch the deployment progress
3. Check https://kicka-ettan.se when complete

## 🐛 Troubleshooting

### Deployment Fails

Check the GitHub Actions logs:
- Go to **Actions** tab
- Click on the failed workflow
- Review the error in red

### SSH Connection Issues

```bash
# Test SSH connection from your local machine
ssh -i ~/.ssh/kicka_ettan_deploy deploy@YOUR_DROPLET_IP

# If this works, the SSH key is correct
```

### Service Won't Start

SSH into droplet and check:
```bash
sudo journalctl -u kicka_ettan -n 50
```

## 🔄 Workflow Customization

Edit `.github/workflows/deploy.yml` to:
- Add tests before deployment
- Send Slack/Discord notifications
- Deploy to staging first
- Add health checks

## 🎉 Done!

Now every push to `main` automatically deploys to production! 🚀
