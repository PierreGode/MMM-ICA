Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 30 * 60 * 1000, // Update every 30 minutes.
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
        }, this
getCardAccounts: function() {
console.log("Retrieving card accounts");
const options = {
method: "GET",
url: ${this.config.apiUrl}/user/cardaccounts,
headers: {
"AuthenticationTicket": this.authTicket
}
};

this.sendSocketNotification("GET_CARD_ACCOUNTS", options);

// Schedule the next call to the card accounts API.
this.scheduleUpdate(this.config.updateInterval);
},

getFavoriteStores: function() {
console.log("Retrieving favorite stores");
const options = {
method: "GET",
url: ${this.config.storeApiUrl}/user/stores,
headers: {
"AuthenticationTicket": this.authTicket
}
};

this.sendSocketNotification("GET_FAVORITE_STORES", options);

// Schedule the next call to the favorite stores API.
this.scheduleUpdate(this.config.updateInterval);
},

scheduleUpdate: function(delay) {
const self = this;
clearTimeout(this.updateTimer);
this.updateTimer = setTimeout(() => {
self.getCardAccounts();
self.getFavoriteStores();
}, delay);
},

// Override notification received handler.
notificationReceived: function(notification, payload, sender) {
switch (notification) {
case "DOM_OBJECTS_CREATED":
this.getCardAccounts();
this.getFavoriteStores();
break;
default:
break;
}
},

// Override suspend handler.
suspend: function() {
clearTimeout(this.updateTimer);
},

// Override resume handler.
resume: function() {
this.getCardAccounts();
this.getFavoriteStores();
},
});
getCardAccounts: function() {
console.log("Retrieving card accounts");
const options = {
method: "GET",
url: ${this.config.apiUrl}/user/cardaccounts,
headers: {
"AuthenticationTicket": this.authTicket
}
};

this.sendSocketNotification("GET_CARD_ACCOUNTS", options);

// Schedule the next call to the card accounts API.
const self = this;
setTimeout(() => {
self.getCardAccounts();
}, self.config.updateInterval);
},

getFavoriteStores: function() {
console.log("Retrieving favorite stores");
const options = {
method: "GET",
url: ${this.config.storeApiUrl}/user/stores,
headers: {
"AuthenticationTicket": this.authTicket
}
};

this.sendSocketNotification("GET_FAVORITE_STORES", options);

// Schedule the next call to the favorite stores API.
const self = this;
setTimeout(() => {
self.getFavoriteStores();
}, self.config.updateInterval);
}

});
}
});
