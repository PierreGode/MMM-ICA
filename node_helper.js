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

      // Call makeCardAccountsRequest immediately
      self.makeCardAccountsRequest();

      // Call makeCardAccountsRequest every minute
      setInterval(() => {
        self.makeCardAccountsRequest();
      }, 60000);

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
  },
makeOffersRequest: function(options) {
  var self = this;
  request(options, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      const offers = JSON.parse(body);
      console.log("Got offers:", offers);
      self.sendSocketNotification("OFFERS_RESULT", { offers: offers });
    } else {
      console.error(`Error getting offers: ${error}`);
      self.sendSocketNotification("OFFERS_RESULT", { error: error });
    }
  });
},
  makeFavoriteStoresRequest: function(options) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const favoriteStores = JSON.parse(body);
        console.log("Got favorite stores:", favoriteStores);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { favoriteStores: favoriteStores });

        const offersOptions = {
          method: "GET",
          url: `${self.config.storeApiUrl}/offers?Stores=${self.config.offersStoreId}`,
          headers: {
            "AuthenticationTicket": self.authTicket
          }
        };
if (self.config.offersStoreId) {
  const storeId = self.config.offersStoreId;
  offersOptions.url = `${offersOptions.url}/store/${storeId}`;
  console.log(`Retrieving offers for store ${storeId}`);
} else {
  console.log("Retrieving all offers");
}

        self.makeOffersRequest(offersOptions);
      } else {
        console.error(`Error getting favorite stores: ${error}`);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { error: error });
      }
    });
  }
});
