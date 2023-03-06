Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 60 * 60 * 1000,
    retryDelay: 5 * 60 * 1000,
    settings: {
      apiEndpoints: [
        { name: "stores", enabled: true },
        { name: "minbonus", enabled: true },
        { name: "offers", enabled: true, storeId: "11111" }
      ]
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
      wrapper.innerHTML = `Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Balance}`;
    } else {
      wrapper.innerHTML = "Waiting for card accounts...";
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
    } else if (notification === "STORES_RESULT") {
      if (payload.error) {
        console.error(`Error getting stores: ${payload.error}`);
        setTimeout(() => {
          this.getStores();
        }, this.config.retryDelay);
       return;
      }

      console.log(`Got stores: ${JSON.stringify(stores)}`);
      this.stores = stores;
      this.updateDom();

      // Schedule the next call to the stores API.
      setTimeout(() => {
        this.getStores();
      }, this.config.updateInterval);
    } else if (notification === "MIN_BONUS_RESULT") {
      if (payload.error) {
        console.error(`Error getting min bonus: ${payload.error}`);
        setTimeout(() => {
          this.getMinBonus();
        }, this.config.retryDelay);
        return;
      }

      const minBonus = payload.minBonus;
      if (!minBonus) {
        console.error("Error: Unable to retrieve min bonus.");
        setTimeout(() => {
          this.getMinBonus();
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got min bonus: ${minBonus}`);
      this.minBonus = minBonus;
      this.updateDom();

      // Schedule the next call to the min bonus API.
      setTimeout(() => {
        this.getMinBonus();
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

  getStores: function() {
    console.log("Retrieving stores");

    const options = {
      method: "GET",
      url: `${this.config.storeApiUrl}/user/stores`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_STORES", options);
  },

  getMinBonus: function() {
    console.log("Retrieving min bonus");

    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/user/minbonustransaction`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_MIN_BONUS", options);
  },

  getOffers: function() {
    console.log("Retrieving offers");

    const storeId = this.config.settings.apiEndpoints.find(e => e.name === "offers")?.storeId;
    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/offers?Stores=${storeId}`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_OFFERS", options);
  }
});
