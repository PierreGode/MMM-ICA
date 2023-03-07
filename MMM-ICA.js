Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    showCardAccounts: true, // Set to true to show the card account information.
    showStores: false // Set to true to show the stores information.
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

    if (this.stores) {
      wrapper.innerHTML = `Store: ${this.stores[0].Name}`;
    } else if (this.config.showStores) {
      wrapper.innerHTML = "Waiting for stores...";
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
       
getData: function() {
if (this.config.showCardAccounts) {
const cardAccountsOptions = {
method: "GET",
url: ${this.config.apiUrl}/user/cardaccounts,
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

// node_helper.js
const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
start: function() {
console.log(Starting helper: ${this.name});
},

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
  this.makeCardAccountsRequest(payload);
} else if (notification === "GET_STORES") {
  this.makeStoresRequest(payload);
}
},

makeRequest: function(options) {
var self = this;
request(options, function(error, response, body) {
if (!error && response.statusCode === 200) {
const authTicket = response.headers["authenticationticket"];
console.log(response.headers); // Add this line
if (!authTicket) {
console.error("Error: Unable to retrieve authentication ticket.");
self.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
return;
}
      console.log(`Got authentication ticket: ${authTicket}`);
    self.authTicket = authTicket;

    self.sendSocketNotification("AUTH_TICKET_RESULT", { authTicket: authTicket });
  } else {
    console.error(`Error getting authentication ticket: ${error}`);
    self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
  }
});
},

makeCardAccountsRequest: function(options) {
var self = this;
request(options, function(error, response, body) {
if (!error && response.statusCode === 200) {
const cardAccounts = JSON.parse(body);
console.log("Got card accounts:", cardAccounts);
self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });
} else {
console.error(Error getting card accounts: ${error});
self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
}
});
},

makeStoresRequest: function(options) {
var self = this;
request(options, function(error, response, body) {
if (!error && response.statusCode === 200) {
const stores = JSON.parse(body);
console.log("Got stores:", stores);
self.sendSocketNotification("STORES_RESULT", { stores: stores });
} else {
console.error(Error getting stores: ${error});
self.sendSocketNotification("STORES_RESULT", { error: error });
}
});
