using '../main.bicep'

param appName = 'famco'
param environment = 'prod'
param location = 'uksouth'
param dbAdminLogin = 'famcoadmin'
param corsAllowedOrigins = [
  'https://famco.fensatech.com'
]
param postgresAllowedFirewallIps = []
// dbAdminPassword is passed securely from the ADO pipeline variable group
