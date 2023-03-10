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

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores.join();
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores}`;
        wrapper.appendChild(favoriteStoresDiv);
      }

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
socketNotificationReceived: function(notification, payload) {
  console.log("Received socket notification:", notification, "with payload:", payload);

  if (notification === "GET_AUTH_TICKET") {
    this.config = payload;
    console.log("Retrieving authentication ticket");

    const authHeader = `Basic ${Buffer.from(`${payload.username}:${payload.password}`).toString("base64")}`;
    const options = {
      method: "GET",
      url: `${payload.apiUrl}/login`,
      headers: {
        "Authorization": authHeader
      }
    };

    this.makeRequest(options);
  } else if (notification === "GET_CARD_ACCOUNTS") {
    console.log("Retrieving card accounts");
    const self = this;
    request(payload, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const cardAccounts = JSON.parse(body);
        console.log("Got card accounts:", cardAccounts);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });
        const favoriteStoresOptions = {
          method: "GET",
          url: `${self.config.storeApiUrl}/user/stores`,
          headers: {
            "AuthenticationTicket": self.authTicket
          }
        };
        self.makeFavoriteStoresRequest(favoriteStoresOptions);
      } else {
        console.error(`Error getting card accounts: ${error}`);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
      }
    });
  } else if (notification === "GET_FAVORITE_STORES") {
    console.log("Retrieving favorite stores");
    const self = this;
    request(payload, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const favoriteStores = JSON.parse(body);
        console.log("Got favorite stores:", favoriteStores);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { favoriteStores: favoriteStores });
      } else {
        console.error(`Error getting favorite stores: ${error}`);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { error: error });
      }
    });
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
}

});
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
  }
});
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
  }
});
