// FAMCO — main infrastructure template
// Deploys at resource group scope
// Scales SKUs automatically by environment (dev = cost-optimised, prod = performance-optimised)

@description('Application name (no spaces)')
param appName string = 'famco'

@description('Environment: dev or prod')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Azure region')
param location string = resourceGroup().location

@description('PostgreSQL admin username')
param dbAdminLogin string = 'famcoadmin'

@description('PostgreSQL admin password — passed from pipeline, never hardcode')
@secure()
param dbAdminPassword string

var prefix = '${appName}-${environment}'
var storageAccountName = toLower(take('${appName}${environment}${uniqueString(resourceGroup().id)}', 24))
var acrName            = toLower(take('${appName}${environment}${uniqueString(resourceGroup().id)}acr', 50))

// Environment-aware SKU selection
var postgresSkuName      = environment == 'prod' ? 'Standard_D2s_v3' : 'Standard_B2ms'
var postgresTier         = environment == 'prod' ? 'GeneralPurpose'  : 'Burstable'
var redisSkuName         = environment == 'prod' ? 'Standard'        : 'Basic'
var redisCapacity        = environment == 'prod' ? 1                 : 0
var containerCpu         = environment == 'prod' ? '1.0'             : '0.5'
var containerMemory      = environment == 'prod' ? '2Gi'             : '1Gi'
var containerMaxReplicas = environment == 'prod' ? 20                : 5


// ── Log Analytics (required by Container Apps) ───────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}


// ── Container Apps Environment ───────────────────────────────────────────────

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}


// ── Container Registry (Standard — 100 GB, faster pulls for CI/CD) ───────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Standard' }
  properties: { adminUserEnabled: true }
}


// ── Container App (web + mobile API, scales to 0 when idle) ──────────────────

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-app'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: appName
          // Placeholder image — app-deploy pipeline replaces this on first build
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
          env: [
            { name: 'PORT', value: '3000' }
          ]
        }
      ]
      scale: {
        minReplicas: 0          // scales to zero overnight — saves cost
        maxReplicas: containerMaxReplicas
        rules: [
          {
            name: 'http-rule'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}


// ── PostgreSQL Flexible Server ───────────────────────────────────────────────

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  sku: {
    name: postgresSkuName
    tier: postgresTier
  }
  properties: {
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    version: '16'
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'famco'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}


// ── Storage Account (calendar .ics uploads) ──────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource calendarsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'calendars'
  properties: { publicAccess: 'None' }
}


// ── Azure Cache for Redis (session + API response caching) ───────────────────

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${prefix}-redis'
  location: location
  properties: {
    sku: {
      name: redisSkuName
      family: 'C'
      capacity: redisCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}


// ── Azure Front Door Standard (global CDN + WAF for web + mobile) ────────────

resource frontDoor 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: '${prefix}-fd'
  location: 'global'
  sku: { name: 'Standard_AzureFrontDoor' }
}

resource fdEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: frontDoor
  name: '${prefix}-endpoint'
  location: 'global'
  properties: { enabledState: 'Enabled' }
}

resource fdOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: frontDoor
  name: '${prefix}-og'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 60
    }
  }
}

resource fdOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: fdOriginGroup
  name: '${prefix}-origin'
  properties: {
    hostName: containerApp.properties.configuration.ingress.fqdn
    httpPort: 80
    httpsPort: 443
    originHostHeader: containerApp.properties.configuration.ingress.fqdn
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource fdRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: fdEndpoint
  name: '${prefix}-route'
  dependsOn: [fdOrigin]
  properties: {
    originGroup: { id: fdOriginGroup.id }
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
  }
}


// ── Outputs (used by app-deploy pipeline and variable group setup) ────────────

output containerAppName   string = containerApp.name
output containerAppUrl    string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output frontDoorUrl       string = 'https://${fdEndpoint.properties.hostName}'
output postgresHost       string = postgresServer.properties.fullyQualifiedDomainName
output acrLoginServer     string = acr.properties.loginServer
output acrName            string = acr.name
output storageAccountName string = storageAccount.name
output redisHostName      string = redis.properties.hostName
