Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateNotification: "UPDATE_ICA_MODULE",
    updateInterval: 10 * 60 * 1000, // Update every 10 minutes.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      Saldo: true,
      AccountName: true,
      FavoriteStores: true,
      offers: true, // Add this line to enable the offers feature
      DisplayStoreID: true, // Add this line to include the setting
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

    if (this.config.settings.DisplayStoreID) {
      const storeIDDiv = document.createElement("div");
      storeIDDiv.innerHTML = `Store ID: ${this.config.offersStoreId}`;
      wrapper.appendChild(storeIDDiv);
    }

  } else {
    wrapper.innerHTML = "Loading content...";
  }

if (this.config.offers && this.config.offersStoreId) {
  fetch(`https://handla.api.ica.se/api/offers?Stores=${this.config.offersStoreId}&Fields=Offers&Select=ProductName`)
    .then(response => response.json())
    .then(data => {
      const offersDiv = document.createElement("div");
      const offers = data.Offers;
      const filteredOffers = offers.filter(offer => offer.StoreId.toString() === this.config.offersStoreId);
      if (filteredOffers.length > 0) {
        offersDiv.innerHTML = `Offer:<br>${filteredOffers[0].ProductName}`;
        wrapper.appendChild(offersDiv);
      } else {
        const noOffersDiv = document.createElement("div");
        noOffersDiv.innerHTML = "No offers available for the specified store ID.";
        wrapper.appendChild(noOffersDiv);
      }
    })
    .catch(error => {
      console.error(error);
      const errorDiv = document.createElement("div");
      errorDiv.innerHTML = "An error occurred while retrieving the offers.";
      wrapper.appendChild(errorDiv);
    });
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

    const authTicket = payload.authenticationTicket;
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

    console.log("Got card accounts:", cardAccounts);
    this.cardAccounts = cardAccounts;
    this.updateDom();
  } else if (notification === "FAVORITE_STORES_RESULT") {
    if (payload.error) {
      console.error(`Error getting favorite stores: ${payload.error}`);
      return;
    }

    const favoriteStores = payload.favoriteStores;
    if (!favoriteStores) {
      console.error("Error: Unable to retrieve favorite stores.");
      return;
    }

    console.log("Got favorite stores:", favoriteStores);
    this.favoriteStores = favoriteStores;
    this.updateDom();
  } else if (notification === "OFFERS_RESULT") {
    if (payload.error) {
      console.error(`Error getting offers: ${payload.error}`);
      return;
    }

    const offers = payload.offers;
    if (!offers) {
      console.error("Error: Unable to retrieve offers.");
      return;
    }

    console.log("Got offers:", offers);
    this.offers = offers;
    this.updateDom();
  }
},
});
