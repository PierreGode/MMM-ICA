# MMM-ICA

MMM-ICA is a [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) module for connecting to the Swedish grocery store ICA API.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J2EARPK)

![saldo screenshot](screenshot.png)

For Authentication you need to use basic authentication, information you can find here <https://github.com/svendahlstrand/ica-api>.

## Sample Configuration

How to install:

```shell
cd MagicMirror/modules
```

```shell
git clone https://github.com/PierreGode/MMM-ICA
```

In MagicMirror/config/config.js

```JavaScript
{
  module: "MMM-ICA",
  position: "bottom_right",
  header: "ICA",
  config: {
    username: "",
    password: "",
    apiUrl: "https://handla.api.ica.se/api/",
    storeApiUrl: "https://handla.api.ica.se/api/",
    updateInterval: 900000, // Refresh every 15 minutes.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      Saldo: true, //Show Availible balance on the account 
      AccountName: false,
      FavoriteStores: true, //Show the id of your favorite stores
      DisplayStoreID: true //Show the output of offersStoreId in the mirror
      offlineShoppingLists: true, // enable/disable offline shopping lists feature
    },
    offers: true, // Show offers for the specified store ID
    offersStoreId: "15215" // Default store ID for which offers will be displayed
  }
},
```

## API

For more information on the ICA API, see the ica-api repository <https://github.com/svendahlstrand/ica-api>.

Big thanks to svendahlstrand for the API source.

Api free: yes

## Links

- The page for MagicMirror². <https://magicmirror.builders/>
- You can find this module and many more in 3rd Party Modules on the MagicMirror page: <https://github.com/MagicMirrorOrg/MagicMirror/wiki/3rd-party-modules>.

## Development Status

WIP
