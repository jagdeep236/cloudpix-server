# CloudPix Backend Deployment Guide

This guide covers deploying the CloudPix backend to Azure App Service and setting up Azure Functions.

## Prerequisites

- Azure account with active subscription
- Azure CLI installed and configured
- Node.js 16+ installed locally
- Git repository with your code

## 1. Azure Resources Setup

### Create Resource Group

```bash
az group create --name CloudPixRG --location eastus
```

### Create Cosmos DB Account

```bash
az cosmosdb create \
  --name cloudpix-cosmos \
  --resource-group CloudPixRG \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0
```

Get connection string:
```bash
az cosmosdb keys list \
  --name cloudpix-cosmos \
  --resource-group CloudPixRG \
  --type connection-strings
```

### Create Storage Account (for Blob Storage)

```bash
az storage account create \
  --name cloudpixstorage \
  --resource-group CloudPixRG \
  --location eastus \
  --sku Standard_LRS
```

Get connection string:
```bash
az storage account show-connection-string \
  --name cloudpixstorage \
  --resource-group CloudPixRG
```

Create container:
```bash
az storage container create \
  --name cloudpix-files \
  --connection-string "your-connection-string" \
  --public-access blob
```

### Create Application Insights

```bash
az monitor app-insights component create \
  --app cloudpix-insights \
  --location eastus \
  --resource-group CloudPixRG
```

Get connection string:
```bash
az monitor app-insights component show \
  --app cloudpix-insights \
  --resource-group CloudPixRG \
  --query connectionString
```

## 2. Deploy to Azure App Service

### Create App Service Plan

```bash
az appservice plan create \
  --name CloudPixPlan \
  --resource-group CloudPixRG \
  --sku B1 \
  --is-linux
```

### Create Web App

```bash
az webapp create \
  --name cloudpix-api \
  --resource-group CloudPixRG \
  --plan CloudPixPlan \
  --runtime "NODE:18-lts"
```

### Configure Application Settings

```bash
az webapp config appsettings set \
  --name cloudpix-api \
  --resource-group CloudPixRG \
  --settings \
    AZURE_COSMOS_CONNECTION_STRING="your-cosmos-connection-string" \
    COSMOS_DB_NAME="CloudPixDB" \
    AZURE_BLOB_CONNECTION_STRING="your-blob-connection-string" \
    BLOB_CONTAINER_NAME="cloudpix-files" \
    JWT_SECRET="your-secret-key-change-this" \
    JWT_EXPIRY="24h" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="your-appinsights-connection-string" \
    NODE_ENV="production" \
    PORT="8080"
```

### Deploy Code

**Option 1: Using Git (Recommended)**

```bash
# Add Azure remote
az webapp deployment source config-local-git \
  --name cloudpix-api \
  --resource-group CloudPixRG

# Get deployment URL and push
git remote add azure <deployment-url>
git push azure main
```

**Option 2: Using ZIP Deploy**

```bash
# Build the project
npm run build

# Create ZIP
cd dist
zip -r ../deploy.zip .
cd ..

# Deploy
az webapp deployment source config-zip \
  --resource-group CloudPixRG \
  --name cloudpix-api \
  --src deploy.zip
```

**Option 3: Using GitHub Actions**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: azure/webapps-deploy@v2
        with:
          app-name: 'cloudpix-api'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

## 3. Deploy Azure Functions

### Install Azure Functions Core Tools

```bash
npm install -g azure-functions-core-tools@4
```

### Create Function App

```bash
az functionapp create \
  --name cloudpix-functions \
  --resource-group CloudPixRG \
  --storage-account cloudpixstorage \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18
```

### Configure Function App Settings

```bash
az functionapp config appsettings set \
  --name cloudpix-functions \
  --resource-group CloudPixRG \
  --settings \
    AZURE_BLOB_CONNECTION_STRING="your-blob-connection-string" \
    BLOB_CONTAINER_NAME="cloudpix-files" \
    COSMOS_DB_ENDPOINT="your-cosmos-endpoint" \
    COSMOS_DB_KEY="your-cosmos-key" \
    COSMOS_DB_NAME="CloudPixDB"
```

### Deploy Functions

```bash
cd functions
npm install
npm run build

# Deploy
func azure functionapp publish cloudpix-functions
```

## 4. Post-Deployment Configuration

### Enable CORS (if needed)

```bash
az webapp cors add \
  --name cloudpix-api \
  --resource-group CloudPixRG \
  --allowed-origins "https://your-frontend-domain.com"
```

### Configure Custom Domain (Optional)

```bash
az webapp config hostname add \
  --webapp-name cloudpix-api \
  --resource-group CloudPixRG \
  --hostname api.cloudpix.com
```

### Enable Logging

```bash
az webapp log config \
  --name cloudpix-api \
  --resource-group CloudPixRG \
  --application-logging filesystem \
  --level information
```

## 5. Monitoring & Scaling

### View Logs

```bash
az webapp log tail \
  --name cloudpix-api \
  --resource-group CloudPixRG
```

### Scale App Service

```bash
# Scale up (change SKU)
az appservice plan update \
  --name CloudPixPlan \
  --resource-group CloudPixRG \
  --sku P1V2

# Scale out (add instances)
az appservice plan update \
  --name CloudPixPlan \
  --resource-group CloudPixRG \
  --number-of-workers 3
```

### Enable Auto-scaling

```bash
az monitor autoscale create \
  --name CloudPixAutoscale \
  --resource-group CloudPixRG \
  --resource /subscriptions/{sub-id}/resourceGroups/CloudPixRG/providers/Microsoft.Web/serverfarms/CloudPixPlan \
  --min-count 1 \
  --max-count 10 \
  --count 2
```

## 6. Security Best Practices

1. **Use Key Vault for Secrets**:
   ```bash
   az keyvault create --name cloudpix-vault --resource-group CloudPixRG
   ```

2. **Enable HTTPS Only**:
   ```bash
   az webapp update \
     --name cloudpix-api \
     --resource-group CloudPixRG \
     --https-only true
   ```

3. **Configure Managed Identity** (for accessing Azure services without connection strings)

## 7. Troubleshooting

### Check Application Logs
```bash
az webapp log tail --name cloudpix-api --resource-group CloudPixRG
```

### Restart App Service
```bash
az webapp restart --name cloudpix-api --resource-group CloudPixRG
```

### Check Function App Logs
```bash
func azure functionapp logstream cloudpix-functions
```

## 8. CI/CD with GitHub Actions

See `.github/workflows/` for example workflows.

## Cost Optimization

- Use Consumption Plan for Functions (pay-per-execution)
- Use Basic/Standard App Service Plan for development
- Enable Cosmos DB autoscale
- Use Blob Storage cool tier for old files
- Set up lifecycle management policies

## Next Steps

- Set up custom domain and SSL certificate
- Configure Azure Front Door for CDN
- Set up backup and disaster recovery
- Implement monitoring alerts
- Configure auto-scaling rules

