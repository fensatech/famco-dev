// Deploys at subscription scope — creates the resource group
targetScope = 'subscription'

@description('Name of the resource group to create')
param resourceGroupName string

@description('Azure region (e.g. uksouth, eastus)')
param location string

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
}

output resourceGroupName string = rg.name
