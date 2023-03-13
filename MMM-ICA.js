Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateNotification: "UPDATE_ICA_MODULE",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      Saldo: true,
      AccountName: true,
      FavoriteStores: true
    },
    offersStoreId: "" // Default store ID for which offers will be displayed
  },
  start: function() {
    console.log("Module config:", this.config);
    Log.info(`Starting module: ${this.name}`);

    if (!this.config.username || !this.config.password) {
      console.error("Error: username or password not provided in module config.");
      this.authTicket = "";
      this.updateDom();
      return;
    }

    this.sendSocketNotification("GET_AUTH_TICKET", this.config);
  },
  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "small bright";

    if (this.cardAccounts) {
      if (this.config.settings.Saldo) {
        const saldoDiv = document.createElement("div");
        saldoDiv.innerHTML = `Tillgängligt Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Available}`;
        wrapper.appendChild(saldoDiv);
      }

      if (this.config.settings.AccountName) {
        const accountNameDiv = document.createElement("div");
        accountNameDiv.innerHTML = `Account Name: ${this.cardAccounts.Cards[0].Accounts[0].AccountName}`;
        wrapper.appendChild(accountNameDiv);
      }

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores.join();
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores}`;
        wrapper.appendChild(favoriteStoresDiv);
      }

      if (this.config.settings.offers && this.offers && this.config.offersStoreId) {
        const offersDiv = document.createElement("div");
        const offers = this.offers.Offers.filter(offer => offer.StoreId === this.config.offersStoreId);
        if (offers.length > 0) {
          offersDiv.innerHTML = "Offers:<br>";
          offers.forEach(offer => {
            offersDiv.innerHTML += `${offer.ProductName} - ${offer.SizeOrQuantity}<br>`;
          });
          wrapper.appendChild(offersDiv);
        } else {
          const noOffersDiv = document.createElement("div");
          noOffersDiv.innerHTML = "No offers available for the specified store ID.";
          wrapper.appendChild(noOffersDiv);
        }
      }

      if (this.config.settings.DisplayStoreID) {
        const storeIDDiv = document.createElement("div");
        storeIDDiv.innerHTML = `Store ID: ${this.config.offersStoreId}`;
        wrapper.appendChild(storeIDDiv);
      }

    } else {
      wrapper.innerHTML = "Loading content...";
    }

    return wrapper;
  },
makeCardAccountsRequest: function(options) {
    console.log("Making card accounts request with options:", options);
    const { apiUrl, authTicket } = options;
    const headers = {
      Accept: "application/vnd.ica.banken.cardaccounts.v1+json",
      "Content-Type": "application/vnd.ica.banken.cardaccounts.v1+json",
      Authorization: `Bearer ${authTicket}`
    };
    const requestOptions = {
      method: "GET",
      headers
    };
    const requestUrl = `${apiUrl}/cardaccounts`;

    fetch(requestUrl, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Received status ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Received card accounts:", data);
        this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: data });
      })
      .catch(error => {
        console.error(`Error making card accounts request: ${error}`);
        this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error });
      });
  },
makeFavoriteStoresRequest: function(options) {
  console.log("Making favorite stores request with options:", options);
  const { apiUrl, authTicket } = options;
  const url = `${apiUrl}/Favorites/GetFavoriteStores`;

  const params = {
    authTicket: authTicket,
    serviceType: "ICA"
  };

  const headers = {
    "Content-Type": "application/json"
  };

  const requestConfig = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(params)
  };

  return fetch(url, requestConfig)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Received ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Favorite stores data:", data);
      return data;
    })
    .catch(error => {
      console.error(`Error making favorite stores request: ${error}`);
      return { error: error.message };
    });
},
