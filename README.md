#MMM-ICA is a Magic Mirror module for connecting to the Swedish grocery store ICA API.



[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J2EARPK)





THIS JUST STARTED AND IS MISSING 80% OF FUNCTIONS
Ittiration 3: shows balance, Account name, Favorite stores ID

![saldo](https://user-images.githubusercontent.com/8579922/223672603-f17baa02-02f9-424a-ab85-51cec0817792.png)


For Authentication you need to use basic authentication, information you can find here https://github.com/svendahlstrand/ica-api
## Sample Configuration



how to install:
```
cd MagicMirror/modules
git clone https://github.com/PierreGode/MMM-ICA.git

```
in MagicMirror/config/config.js



```
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
    },
    offers: true, // Show offers for the specified store ID
    offersStoreId: "15215" // Default store ID for which offers will be displayed
  }
},

```
For the module to update you need MMM-ModuleScheduler
https://github.com/ianperrin/MMM-ModuleScheduler
and in config.js
```
{
      module: "MMM-ModuleScheduler",
      config: {
        notification_schedule: [
          { notification: "UPDATE_ICA_MODULE", schedule: "*/30 * * * *" }, // refresh every 30 minutes
        ],
      },
    },
```
<p>

API reference
For more information on the ICA API, see the ica-api repository. https://github.com/svendahlstrand/ica-api 

Big thanks to svendahlstrand for the API source.

The page for Magic Mirror. https://magicmirror.builders/

You can find this module and many more in 3rd Party Modules on the Magic Mirror page
https://github.com/MichMich/MagicMirror/wiki/3rd-party-modules

