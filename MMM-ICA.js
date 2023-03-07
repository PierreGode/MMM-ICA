Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000 // Retry every 5 minutes if an error occurs.
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

    if (this.cardAccounts && this.config.showCardAccounts) {
      wrapper.innerHTML += `Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Balance}<br>`;
    }

    if (this.stores && this.config.showStores) {
      wrapper.innerHTML += `Butik: ${this.stores[0].Address.PostalArea}<br>`;
    }

    if (!this.cardAccounts && !this.stores) {
      wrapper.innerHTML = "Waiting for data...";
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

      if (this.config.showCardAccounts) {
        // Schedule the first call to the card accounts API.
        setTimeout(() => {
          this.getCardAccounts();
        }, this.config.updateInterval);
      }

      if (this.config.showStores) {
        // Schedule the first call to the stores API.
        setTimeout(() => {
          this.getStores();
        }, this.config.updateInterval);
      }
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
    }
  },

  getCardAccounts: function() {
  },

  getStores: function() {
    console.log("Retrieving stores");

    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/user/stores`,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_STORES", options);
  }
});
