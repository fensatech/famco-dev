using '../main.bicep'

param appName = 'famco'
param environment = 'dev'
param location = 'eastus2'
param dbAdminLogin = 'famcoadmin'
// dbAdminPassword is passed securely from the ADO pipeline variable group
