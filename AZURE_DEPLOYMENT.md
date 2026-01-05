# Azure App Service Deployment Guide

This guide covers deploying the CloudPix backend to Azure App Service with CI/CD via GitHub Actions.

## Prerequisites

1. ✅ Azure App Service created (name: `cloudpix`)
2. ✅ GitHub repository with code
3. ✅ Azure resources created:
   - Cosmos DB account
   - Storage Account (Blob Storage)
   - Application Insights (optional)

## Step 1: Configure Application Settings in Azure Portal

**CRITICAL**: You must set these environment variables in Azure Portal **BEFORE** deployment.

### Via Azure Portal

1. Go to Azure Portal
2. Navigate to your App Service (`cloudpix`)
3. Go to **Configuration** > **Application settings**
4. Click **+ New application setting** for each variable below

### Required Settings

| Setting Name | Example Value | Description |
|-------------|---------------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `8080` | Server port (optional - Azure sets this automatically) |

#### Azure Cosmos DB

**Option 1: Connection String (Recommended)**
| Setting Name | Example Value |
|-------------|---------------|
| `AZURE_COSMOS_CONNECTION_STRING` | `AccountEndpoint=https://...;AccountKey=...;` |

**Option 2: Endpoint + Key**
| Setting Name | Example Value |
|-------------|---------------|
| `COSMOS_DB_ENDPOINT` | `https://your-account.documents.azure.com:443/` |
| `COSMOS_DB_KEY` | `your-primary-key` |
| `COSMOS_DB_NAME` | `CloudPixDB` |

#### Azure Blob Storage

| Setting Name | Example Value |
|-------------|---------------|
| `AZURE_BLOB_CONNECTION_STRING` | `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;` |
| `BLOB_CONTAINER_NAME` | `cloudpix-files` |

#### Authentication

| Setting Name | Example Value | Notes |
|-------------|---------------|-------|
| `JWT_SECRET` | `your-super-secret-key` | **Generate with**: `openssl rand -base64 32` |
| `JWT_EXPIRY` | `3650d` | JWT expiration (10 years) |

### Optional Settings

| Setting Name | Example Value | Description |
|-------------|---------------|-------------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `InstrumentationKey=...;IngestionEndpoint=...` | For monitoring |
| `FRONTEND_URL` | `https://your-frontend.azurewebsites.net` | Frontend URL for CORS and share links |

### Via Azure CLI

```bash
az webapp config appsettings set \
  --name cloudpix \
  --resource-group CloudPixRG \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    AZURE_COSMOS_CONNECTION_STRING="your-cosmos-connection-string" \
    COSMOS_DB_NAME="CloudPixDB" \
    AZURE_BLOB_CONNECTION_STRING="your-blob-connection-string" \
    BLOB_CONTAINER_NAME="cloudpix-files" \
    JWT_SECRET="your-jwt-secret" \
    JWT_EXPIRY="3650d" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="your-appinsights-connection-string" \
    FRONTEND_URL="https://your-frontend.azurewebsites.net"
```

## Step 2: Get Connection Strings

### Cosmos DB Connection String

```bash
az cosmosdb keys list \
  --name your-cosmos-account \
  --resource-group CloudPixRG \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

### Blob Storage Connection String

```bash
az storage account show-connection-string \
  --name your-storage-account \
  --resource-group CloudPixRG \
  --query connectionString \
  --output tsv
```

### Application Insights Connection String

```bash
az monitor app-insights component show \
  --app your-app-insights \
  --resource-group CloudPixRG \
  --query connectionString \
  --output tsv
```

## Step 3: Configure Startup Command (Linux App Service)

For Linux App Service, set the startup command:

1. Go to **Configuration** > **General settings**
2. Set **Startup Command** to:
   ```
   node -r ./config.js ./dist/index.js
   ```

Or use the `startup.sh` script:
```
/home/site/wwwroot/startup.sh
```

## Step 4: Deploy

### Automatic Deployment (CI/CD)

1. Push code to the `main` branch
2. GitHub Actions will automatically:
   - Build the application
   - Deploy to Azure App Service

### Manual Deployment

If you need to deploy manually:

```bash
cd backend
npm run build
cd deploy
az webapp deployment source config-zip \
  --resource-group CloudPixRG \
  --name cloudpix \
  --src deploy.zip
```

## Step 5: Verify Deployment

1. Check the deployment logs in GitHub Actions
2. Visit your App Service URL: `https://cloudpix.azurewebsites.net`
3. Test the health endpoint: `https://cloudpix.azurewebsites.net/api/health`
4. Check Application Insights for telemetry

## Environment Variables Reference

All environment variables are read from Azure App Service **Application Settings**. The application will:

1. **First**: Check `process.env` (Azure App Settings) - **This is what Azure uses**
2. **Fallback**: Load `.env.production` file if not in Azure (for local testing)
3. **Default**: Use hardcoded defaults where specified

### How It Works

- **Azure App Service**: Environment variables are set via **Application Settings** in Azure Portal
- **Local Development**: Uses `.env.development` file in `backend/config/`
- **Production Build**: Uses `.env.production` file (if exists) or App Settings

### Required Variables

- `NODE_ENV`: `production`
- `AZURE_COSMOS_CONNECTION_STRING` or (`COSMOS_DB_ENDPOINT` + `COSMOS_DB_KEY`)
- `COSMOS_DB_NAME`
- `AZURE_BLOB_CONNECTION_STRING`
- `BLOB_CONTAINER_NAME`
- `JWT_SECRET`

### Optional Variables

- `PORT`: Server port (defaults to Azure's PORT or 3000)
- `JWT_EXPIRY`: JWT expiration (default: `3650d`)
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: For monitoring
- `FRONTEND_URL`: For CORS and share link generation

## Troubleshooting

### Application Not Starting

1. Check **Log stream** in Azure Portal
2. Check **Console** in Azure Portal for startup errors
3. Verify all environment variables are set correctly
4. Check that `PORT` is set (Azure sets this automatically, but verify)

### Build Failures

1. Check GitHub Actions logs
2. Verify Node.js version matches (18.x)
3. Check that all dependencies are in `package.json`

### Database Connection Issues

1. Verify Cosmos DB connection string is correct
2. Check Cosmos DB firewall rules (allow Azure services)
3. Verify database name matches

### Blob Storage Issues

1. Verify Blob Storage connection string
2. Check container exists and is accessible
3. Verify container name matches

### Environment Variables Not Working

1. **Important**: Environment variables must be set in Azure Portal **Application Settings**
2. They are NOT read from `.env` files in Azure
3. Restart the app after setting environment variables
4. Check Log stream to see what values are being read

## Security Best Practices

1. **Never commit secrets to git** - Use Azure App Settings
2. **Use Azure Key Vault** for highly sensitive values (optional)
3. **Rotate secrets regularly** - Especially JWT_SECRET
4. **Use strong JWT_SECRET** - Generate with: `openssl rand -base64 32`
5. **Enable HTTPS only** in App Service settings

## Monitoring

- **Application Insights**: View logs, metrics, and traces
- **Log Stream**: Real-time logs in Azure Portal
- **Metrics**: CPU, memory, requests in Azure Portal
- **Alerts**: Set up alerts for errors and performance

## Next Steps

- Set up custom domain and SSL certificate
- Configure staging slots for blue-green deployments
- Set up backup and disaster recovery
- Configure monitoring alerts
- Set up Azure Front Door for CDN

