const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({

  start: function() {
    console.log(`Starting helper: ${this.name}`);
  },

  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "GET_AUTH_TICKET") {
      this.config = payload;
      this.getAuthTicket();
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const options = payload;
      options.headers["AuthenticationTicket"] = this.authTicket;
      this.makeRequest(options, "CARD_ACCOUNTS_RESULT");
    } else if (notification === "GET_STORES") {
      const options = {
        method: "GET",
        url: `${this.config.storeApiUrl}/user/stores`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };
      this.makeRequest(options, "STORES_RESULT");
    } else if (notification === "GET_MINBONUS_TRANSACTIONS") {
      const options = {
        method: "GET",
        url: `${this.config.apiUrl}/user/minbonustransaction`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };
      this.makeRequest(options, "MINBONUS_TRANSACTIONS_RESULT");
    } else if (notification === "GET_OFFERS") {
      this.getOffers();
    }
  },

  makeRequest: function(options, resultNotification) {
    const self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const result = JSON.parse(body);
        console.log(`Got ${resultNotification}:`, result);
        self.sendSocketNotification(resultNotification, { result: result });
      } else {
        console.error(`Error getting ${resultNotification}: ${error}`);
        self.sendSocketNotification(resultNotification, { error: error });
      }
    });
  },

  getAuthTicket: function() {
    console.log("Retrieving authentication ticket");

    const authHeader = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`;
    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/login`,
      headers: {
        "Authorization": authHeader
      }
    };

    const self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const result = JSON.parse(body);
        const authTicket = result.AuthenticationTicket;
        console.log(`Got authentication ticket: ${authTicket}`);
        self.authTicket = authTicket;
        self.startRequests();
      } else {
        console.error(`Error getting authentication ticket: ${error}`);
        self.authTicket = "";
        setTimeout(() => {
          self.getAuthTicket();
        }, self.config.retryDelay);
      }
    });
  },

  startRequests: function() {
    // Schedule the first call to the card accounts API.
    setTimeout(() => {
      this.getCardAccounts();
    }, this.config.updateInterval);

    // Schedule the first call to the stores API.
    setTimeout(() => {
      this.getStores();
    }, this.config.updateInterval);

    // Schedule the first call to the minbonus transactions API.
    setTimeout(() => {
      this.getMinBonusTransactions();
    }, this.config.updateInterval);

    // Schedule the first call to the offers API.
    setTimeout(() => {
      this.getOffers();
    }, this.config.updateInterval);
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

    let url = `${this.config.apiUrl}/offers`;
    if (this.config.settings.apiEndpoints.offers.storeId) {
      url += `?Stores=${this.config.settings.apiEndpoints.offers.storeId}`;
    }

    const options = {
      method: "GET",
      url: url,
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    this.sendSocketNotification("GET_OFFERS", options);
  }
});

