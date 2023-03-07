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
      const options = payload;
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json"
      };

      this.makeCardAccountsRequest(options);
    }
  },

  makeRequest: function(options) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const authTicket = response.headers["authenticationticket"];
        console.log(response.headers);

        if (!authTicket) {
          console.error("Error: Unable to retrieve authentication ticket.");
          self.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
          return;
        }

        console.log(`Got authentication ticket: ${authTicket}`);
        self.authTicket = authTicket;

        const cardAccountsOptions = {
          method: "GET",
          url: `${self.config.apiUrl}/user/cardaccounts`,
          headers: {
            "AuthenticationTicket": authTicket
          }
        };

        self.makeCardAccountsRequest(cardAccountsOptions);
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
        const apiEndpoints = self.config.apiEndpoints;
        let result = {};

        if (apiEndpoints.minbonus) {
          result.minBonus = JSON.parse(body).Cards[0].Accounts[0].Balance;
        }

        if (apiEndpoints.stores) {
          const stores = JSON.parse(body).Stores;
          result.stores = stores.map((store) => ({ StoreId: store.StoreId, Name: store.Name }));
        }

        if (apiEndpoints.offers) {
          const storeId = apiEndpoints.offers;
          const offers = JSON.parse(body).Offers.filter((offer) => offer.StoreId === storeId);
          result.offers = { Offers: offers };
        }

        console.log(`Got card accounts: ${JSON.stringify(result)}`);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", result);
      } else {
        console.error(`Error getting card accounts: ${error}`);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
      }
    });
  }
});
});
