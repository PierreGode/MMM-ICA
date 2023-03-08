#MMM-ICA is a Magic Mirror module for connecting to the Swedish grocery store ICA API.



[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J2EARPK)





THIS JUST STARTED AND IS MISSING 99% OF FUNCTIONS
Ittiration 1: shows balance

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
    updateInterval: 60 * 60 * 1000,
    retryDelay: 10 * 60 * 1000,
    settings: {
      Saldo: true,
      AccountName: false
    }
  }
},

```




API reference
For more information on the ICA API, see the ica-api repository. https://github.com/svendahlstrand/ica-api 

Big thanks to svendahlstrand for the API source.
