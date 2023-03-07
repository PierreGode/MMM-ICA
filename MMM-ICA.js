Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    showCardAccounts: true,
    showStores: true
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
      if (this.config.showCardAccounts) {
        for (const card of this.cardAccounts.Cards) {
          for (const account of card.Accounts) {
            wrapper.innerHTML += `${card.CardDescription} (${account.AccountDescription}): ${account.Balance}<br>`;
          }
        }
      }
      if (this.config.showStores && this.stores) {
        wrapper.innerHTML += `Butiker: ${this.stores.map(store => store.StoreDescription).join(", ")}`;
      }
    } else {
      wrapper.innerHTML = "Loading content...";
    }

    return wrapper;
  },

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

      setTimeout(() => {
        this.getStores();
      }, this.config.updateInterval);
    } else if (notification === "STORES_RESULT") {
      if (payload.error) {
        console.error(`Error getting stores: ${payload.error}`);
        setTimeout(() => {
          this.getStores();
        }, this.config.retryDelay);
        return;
      }

       const stores = payload.stores;
  if (!stores) {
    console.error("Error: Unable to retrieve stores.");
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
} else {
  console.warn(`Unknown socket notification received: ${notification}`);
}
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
