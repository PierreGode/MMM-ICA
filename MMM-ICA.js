Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateNotification: "UPDATE_ICA_MODULE",
    refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
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
  
      // Refresh the module data every `refreshInterval` milliseconds.
    setInterval(function() {
      self.updateDom();
    }, self.config.refreshInterval);

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

    if (this.config.settings.DisplayStoreID) {
      const storeIDDiv = document.createElement("div");
      storeIDDiv.innerHTML = `Store ID: ${this.config.offersStoreId}`;
      wrapper.appendChild(storeIDDiv);
    }

  } else {
    wrapper.innerHTML = "Loading content...";
  }

  if (this.config.settings.offers && this.offers && this.config.offersStoreId) {
    const offersDiv = document.createElement("div");
    const offers = this.offers.Offers.filter(offer => offer.StoreId === this.config.offersStoreId);
    if (offers.length > 0) {
      const productName = offers[0].ArticleDescription;
      offersDiv.innerHTML = `Offer:<br>${productName}`;
      wrapper.appendChild(offersDiv);
    } else {
      const noOffersDiv = document.createElement("div");
      noOffersDiv.innerHTML = "No offers available for the specified store ID.";
      wrapper.appendChild(noOffersDiv);
    }
  }

  return wrapper;
},


  // Override socket notification handler.
  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "AUTH_TICKET_RESULT") {
      if (payload.error) {
        console.error(`Error getting authentication ticket: ${payload.error}`);
        this.authTicket = "";
        this.updateDom();
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", this.config);
        }, this.config.retryDelay);
        return;
      }

      const authTicket = payload.authTicket;
      if (!authTicket) {
        console.error("Error: Unable to retrieve authentication ticket.");
        this.authTicket = "";
        this.updateDom();
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", this.config);
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got authentication ticket: ${authTicket}`);
      this.authTicket = authTicket;
      this.updateDom();

      // Schedule the first call to the card accounts API.
      setTimeout(() => {
        this.getCardAccounts();
      }, this.config.updateInterval);
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      if (payload.error) {
        console.error(`Error getting card accounts: ${payload.error}`);
        setTimeout(() => {
          this.getCardAccounts();
        }, this.config.retryDelay);
        return;
      }

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
      this.favoriteStores = favoriteStores;
      this.updateDom();

      // Schedule the next call to the favorite stores API.
      setTimeout(() => {
        this.getFavoriteStores();
      }, this.config.updateInterval);
    } else if (notification === "OFFERS_RESULT") {
      if (payload.error) {
        console.error(`Error getting offers: ${payload.error}`);
        setTimeout(() => {
          this.getOffers();
        }, this.config.retryDelay);
        return;
      }

      const offers = payload.offers;
      if (!offers) {
        console.error("Error: Unable to retrieve offers.");
        setTimeout(() => {
          this.getOffers();
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got offers: ${JSON.stringify(offers)}`);
      this.offers = offers;
      this.updateDom();

      // Schedule the next call to the offers API.
      setTimeout(() => {
        this.getOffers();
      }, this.config.updateInterval);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },
});
