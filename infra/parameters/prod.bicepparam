using '../main.bicep'

param appName = 'famco'
param environment = 'prod'
param location = 'uksouth'
param dbAdminLogin = 'famcoadmin'
// dbAdminPassword is passed securely from the ADO pipeline variable group
