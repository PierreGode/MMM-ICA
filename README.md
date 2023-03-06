#MMM-ICA is a Magic Mirror module for connecting to the ICA API.

THIS JUST STARTED AND IS MISSING 99% OF FUNCTIONS
Ittiration 1: shows balance

![saldo](https://user-images.githubusercontent.com/8579922/223160998-5eef3106-1b55-4f2e-a614-35ed100a9227.png)

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
    username: "",  //Add your username for Ica
    password: "",  //Add your password for Ica
    apiUrl: "https://handla.api.ica.se/api/",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 10 * 60 * 1000 // Retry every 10 minutes if an error occurs.
  }
},
```




API reference
For more information on the ICA API, see the ica-api repository. https://github.com/svendahlstrand/ica-api 

Big thanks to svendahlstrand for the API source.
