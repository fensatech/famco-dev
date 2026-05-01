using '../main.bicep'

param appName = 'famco'
param environment = 'dev'
param location = 'eastus2'
param dbAdminLogin = 'famcoadmin'
param corsAllowedOrigins = [
  'http://localhost:3000'
]
param postgresAllowedFirewallIps = []
// dbAdminPassword is passed securely from the ADO pipeline variable group
