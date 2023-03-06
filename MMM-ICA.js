Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      apiEndpoints: {
        stores: true, // get stores and store ID, enable this just to list ID of your favorite stores for the offerstoreid
        minbonus: true, // show ICA bonus
        showoffer: true,
        offerstoreid: "" // Use store ID configuration option to show offers from specific store.
      }
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
      wrapper.innerHTML = "Loading content...";
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
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  getCardAccounts: function() {
    console
console.log("Retrieving card accounts");

    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/user/cardaccounts`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_CARD_ACCOUNTS", options);

    if (this.config.settings.apiEndpoints.minbonus) {
      setTimeout(() => {
        this.getMinBonus();
      }, this.config.updateInterval);
    }

    if (this.config.settings.apiEndpoints.stores) {
      setTimeout(() => {
        this.getStores();
      }, this.config.updateInterval);
    }

    if (this.config.settings.apiEndpoints.showoffer && this.config.settings.apiEndpoints.offerstoreid) {
      setTimeout(() => {
        this.getOffers(this.config.settings.apiEndpoints.offerstoreid);
      }, this.config.updateInterval);
    }
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

  getOffers: function(storeId) {
    console.log("Retrieving offers");

    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/offers?Stores=${storeId}`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_OFFERS", options);
  },

  // Override notification handler.
  notificationReceived: function(notification, payload, sender) {
    if (notification === "MMM-ICA-REFRESH") {
      console.log("Received refresh notification.");
      this.getCardAccounts();
      if (this.config.settings.apiEndpoints.minbonus) {
        this.getMinBonus();
      }
      if (this.config.settings.apiEndpoints.stores) {
        this.getStores();
      }
      if (this.config.settings.apiEndpoints.showoffer && this.config.settings.apiEndpoints.offerstoreid) {
        this.getOffers(this.config.settings.apiEndpoints.offerstoreid);
      }
    }
  }
});
