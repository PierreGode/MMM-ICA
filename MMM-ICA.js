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
    // ...

    if (this.config.settings.StoreID) {
      const storeId = this.config.settings.StoreID;
      const storeUrl = `${this.config.apiUrl}/stores/${storeId}`;

      const storeRequest = new XMLHttpRequest();
      storeRequest.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          const store = JSON.parse(this.responseText);
          console.log("Got store:", store);
          const storeNameDiv = document.createElement("div");
          storeNameDiv.innerHTML = `Store Name: ${store.MarketingName}`;
          wrapper.appendChild(storeNameDiv);
        }
      };
      storeRequest.open("GET", storeUrl, true);
      storeRequest.setRequestHeader("AuthenticationTicket", this.authTicket);
      storeRequest.send();
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
        return;
      }

      console.log
  (`Got card accounts: ${JSON.stringify(cardAccounts)}`);
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
  
 updateStoreInfo: function() {
  console.log("Retrieving store information");
  const options = {
    method: "GET",
    url: `${this.config.apiUrl}/stores/${this.config.settings.StoreID}`,
    headers: {
      "AuthenticationTicket": this.authTicket
    }
  };

this.sendSocketNotification("GET_FAVORITE_STORES", options);
}
});
