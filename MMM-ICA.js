Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 60 * 60 * 1000,
    retryDelay: 5 * 60 * 1000,
    settings: {
      Saldo: true,
      AccountName: false,
      FavoriteStores: false,
      StoreID: ""
    }
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
        saldoDiv.innerHTML = `Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Available}`;
        wrapper.appendChild(saldoDiv);
      }

      if (this.config.settings.AccountName) {
        const accountNameDiv = document.createElement("div");
        accountNameDiv.innerHTML = `Account Name: ${this.cardAccounts.Cards[0].Accounts[0].AccountName}`;
        wrapper.appendChild(accountNameDiv);
      }

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores;
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores.join()}`;
        wrapper.appendChild(favoriteStoresDiv);

        favoriteStores.forEach(storeId => {
          const storeApiUrl = `${this.config.storeApiUrl}/stores/${storeId}`;
          const options = {
            method: "GET",
            url: storeApiUrl,
            headers: {
              "AuthenticationTicket": this.authTicket
            }
          };

          this.sendSocketNotification("GET_STORE_INFO", options);
        });
      }
    } else {
      wrapper.innerHTML = "Loading content...";
    }

    return wrapper;
  },

  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "AUTH_TICKET_RESULT") {
      // ...
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      // ...
    } else if (notification === "FAVORITE_STORES_RESULT") {
      // ...
    } else if (notification === "GET_STORE_INFO_RESULT") {
      // handle store info result
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  getCardAccounts: function() {
    console.log("Retrieving card accounts");
    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/user/cardaccounts`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_CARD_ACCOUNTS", options);
  },

  getFavoriteStores: function() {
    console.log("Retrieving favorite stores");
    const options = {
      method: "GET",
      url: `${this.config.storeApiUrl}/user/stores`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_FAVORITE_STORES", options);
   getStoreInfo: function(storeId) {
    console.log(`Retrieving store info for store ID: ${storeId}`);
    const storeApiUrl = `${this.config.storeApiUrl}/stores/${storeId}`;
    const options = {
      method: "GET",
      url: storeApiUrl,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_STORE_INFO", options);
  },

  processStoreInfo: function(storeInfo) {
    const storeName = storeInfo.MarketingName;
    console.log(`Got store info for store ID ${storeInfo.Id}: ${storeName}`);
    if (storeInfo.Id === this.config.settings.StoreID) {
      const storeNameDiv = document.createElement("div");
      storeNameDiv.innerHTML = `Store Name: ${storeName}`;
      this.wrapper.appendChild(storeNameDiv);
    }
  },

  scheduleNextStoreInfoUpdate: function() {
    setTimeout(() => {
      const favoriteStores = this.favoriteStores.FavoriteStores;
      favoriteStores.forEach(storeId => {
        this.getStoreInfo(storeId);
      });
      this.scheduleNextStoreInfoUpdate();
    }, this.config.updateInterval);
  },

  scheduleNextCardAccountUpdate: function() {
    setTimeout(() => {
      this.getCardAccounts();
      this.scheduleNextCardAccountUpdate();
    }, this.config.updateInterval);
  },

  scheduleNextFavoriteStoresUpdate: function() {
    setTimeout(() => {
      this.getFavoriteStores();
      this.scheduleNextFavoriteStoresUpdate();
    }, this.config.updateInterval);
  },

  // Override start and getDom to call the scheduleNext functions.
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

    if (this.config.settings.FavoriteStores) {
      this.scheduleNextStoreInfoUpdate();
    }
  },

  getDom: function() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "small bright";

    if (this.cardAccounts) {
      if (this.config.settings.Saldo) {
        const saldoDiv = document.createElement("div");
        saldoDiv.innerHTML = `Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Available}`;
        this.wrapper.appendChild(saldoDiv);
      }

      if (this.config.settings.AccountName) {
        const accountNameDiv = document.createElement("div");
        accountNameDiv.innerHTML = `Account Name: ${this.cardAccounts.Cards[0].Accounts[0].AccountName}`;
        this.wrapper.appendChild(accountNameDiv);
      }

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores;
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores.join()}`;
        this.wrapper.appendChild(favoriteStoresDiv);
      }
    } else {
      this.wrapper.innerHTML = "Loading content...";
    }

    return this.wrapper;
  }
});

