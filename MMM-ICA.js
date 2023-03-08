Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      Saldo: true,
      AccountName: true,
      FavoriteStores: true
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

      if (this.config.settings.FavoriteStores) {
        if (this.favoriteStores) {
          const favoriteStoresDiv = document.createElement("div");
          favoriteStoresDiv.innerHTML = `Favorite Stores: ${this.favoriteStores}`;
          wrapper.appendChild(favoriteStoresDiv);
        } else {
          const favoriteStoresDiv = document.createElement("div");
          favoriteStoresDiv.innerHTML = "Loading favorite stores...";
          wrapper.appendChild(favoriteStoresDiv);
        }
      }
    } else {
      wrapper.innerHTML = "Loading content...";
    }

    return wrapper;
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
},

// Override socket notification handler.
socketNotificationReceived: function(notification, payload) {
  console.log("Received socket notification:", notification, "with payload:", payload);

  if (notification === "AUTH_TICKET_RESULT") {
    // ...
  } else if (notification === "CARD_ACCOUNTS_RESULT") {
    // ...
  } else if (notification === "FAVORITE_STORES_RESULT") {
    if (payload.error) {
      console.error(`Error getting favorite stores: ${payload.error}`);
      setTimeout(() => {
        this.getFavoriteStores();
      }, this.config.retryDelay);
      return;
    }

    const favoriteStores = payload.favoriteStores;
    if (!favoriteStores) {
      console.error("Error: Unable to retrieve favorite stores.");
      setTimeout(() => {
        this.getFavoriteStores();
      }, this.config.retryDelay);
      return;
    }

    console.log(`Got favorite stores: ${JSON.stringify(favoriteStores)}`);
    const formattedStores = favoriteStores.map(store => `Store ID: ${store}`).join(", ");
    this.favoriteStores = formattedStores;
    this.updateDom();

    // Schedule the next call to the favorite stores API.
    setTimeout(() => {
      this.getFavoriteStores();
    }, this.config.updateInterval);
  } else {
    console.warn(`Unknown socket notification received: ${notification}`);
  }
},

      const cardAccounts = payload.cardAccounts;
      if (!cardAccounts) {
        console.error("Error: Unable to retrieve card accounts.");
        setTimeout(() => {
          this.getCardAccounts();
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got card accounts: ${JSON.stringify(cardAccounts)}`);
      this.cardAccounts = cardAccounts;
      this.updateDom();

      // Schedule the next call to the card accounts API.
      setTimeout(() => {
        this.getCardAccounts();
      }, this.config.updateInterval);
    } else if (notification === "FAVORITE_STORES_RESULT") {
      if (payload.error) {
        console.error(`Error getting favorite stores: ${payload.error}`);
        setTimeout(() => {
          this.getFavoriteStores();
        }, this.config.retryDelay);
        return;
      }

      const favoriteStores = payload.favoriteStores;
      if (!favoriteStores) {
        console.error("Error: Unable to retrieve favorite stores.");
        setTimeout(() => {
          this.getFavoriteStores();
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got favorite stores: ${JSON.stringify(favoriteStores)}`);
      this.favoriteStores = favoriteStores.map(store => store.StoreName).join(", ");
      this.updateDom();

      // Schedule the next call to the favorite stores API.
      setTimeout(() => {
        this.getFavoriteStores();
      }, this.config.updateInterval);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  }
});
