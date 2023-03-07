Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    showCardAccounts: true // Set to true to show the card account information.
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
    } else if (this.config.showCardAccounts) {
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

      // Schedule the first call to the APIs.
      setTimeout(() => {
        this.getData();
      }, this.config.updateInterval);
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      if (payload.error) {
        console.error(`Error getting card accounts: ${payload.error}`);
        setTimeout(() => {
          this.getData();
        }, this.config.retryDelay);
        return;
      }

      const cardAccounts = payload.cardAccounts;
      if (!cardAccounts) {
        console.error("Error: Unable to retrieve card accounts.");
        setTimeout(() => {
          this.getData();
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got card accounts: ${JSON.stringify(cardAccounts)}`);
      this.cardAccounts = cardAccounts;
      this.updateDom();

      // Schedule the next call to the APIs.
      setTimeout(() => {
        this.getData();
      }, this.config.updateInterval);
    } else if (notification === "STORES_RESULT") {
      if (payload.error) {
        console.error(`Error getting stores: ${payload.error}`);
        setTimeout(() => {
          this.getData();
        }, this.config.retryDelay);
        return;
      }

      const stores = payload.stores;
      if (!stores) {
        console.error("Error: Unable to retrieve stores.");
        setTimeout(() => {
          this.getData();
}, this.config.retryDelay);
        return;
      }

      console.log(`Got stores: ${JSON.stringify(stores)}`);
      this.stores = stores;
      this.updateDom();

      // Schedule the next call to the APIs.
      setTimeout(() => {
        this.getData();
      }, this.config.updateInterval);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  getData: function() {
    if (this.config.showCardAccounts) {
      const cardAccountsOptions = {
        method: "GET",
        url: `${this.config.apiUrl}/user/cardaccounts`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };
      this.sendSocketNotification("GET_CARD_ACCOUNTS", cardAccountsOptions);
    }

    if (this.config.showStores) {
      const storesOptions = {
        method: "GET",
        url: `${this.config.apiUrl}/user/stores`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };
      this.sendSocketNotification("GET_STORES", storesOptions);
    }
  }
});
