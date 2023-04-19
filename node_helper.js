const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
start: function() {
  console.log(`Starting helper: ${this.name}`);
  const self = this;
  setInterval(() => {
    const cardAccountsOptions = {
      method: "GET",
      url: `${self.config.apiUrl}/user/cardaccounts`,
      headers: {
        "AuthenticationTicket": self.authTicket
      }
    };
    self.makeCardAccountsRequest(cardAccountsOptions);
  }, 600000); // 10 minutes in milliseconds
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
    const self = this;
    axios(options)
      .then(function(response) {
        if (response.status === 200) {
          const authTicket = response.headers["authenticationticket"];
          console.log(response.headers); // Add this line
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
          console.error(`Error getting authentication ticket: ${response.statusText}`);
          self.sendSocketNotification("AUTH_TICKET_RESULT", { error: response.statusText });
        }
      })
      .catch(function(error) {
        console.error(`Error getting authentication ticket: ${error}`);
        self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error.message });
      });
  },

  makeCardAccountsRequest: function(options) {
    const self = this;
    axios(options)
      .then(function(response) {
        if (response.status === 200) {
          const cardAccounts = response.data;
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
          console.error(`Error getting card accounts: ${response.statusText}`);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: response.statusText });
        }
      })
      .catch(function(error) {
        console.error(`Error getting card accounts: ${error}`);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error.message });
      });
  },

  makeFavoriteStoresRequest: function(options) {
    const self = this;
    axios(options)
      .then(function(response) {
        if (response.status === 200) {
          const favoriteStores = response.data;
          console.log("Got favorite stores:", favoriteStores);
          self.sendSocketNotification("FAVORITE_STORES_RESULT", { favoriteStores: favoriteStores });

          const offersOptions = {
            method: "GET",
            url: `${self.config.storeApiUrl}/offers?Stores=${self.config.offersStoreId}`,
            headers: {
              "AuthenticationTicket": self.authTicket
                        }
        };
        if (self.config.offers) {
          const storeId = self.config.offers;
          offersOptions.url = `${offersOptions.url}/store/${storeId}`;
          console.log(`Retrieving offers for store ${storeId}`);
        } else {
          console.log("Retrieving all offers");
        }
        self.makeOffersRequest(offersOptions);
      } else {
        console.error(`Error getting favorite stores: ${response.statusText}`);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { error: response.statusText });
      }
      })
      .catch(function(error) {
        console.error(`Error getting favorite stores: ${error}`);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { error: error.message });
      });
  },

  makeOffersRequest: function(options) {
    const self = this;
    axios(options)
      .then(function(response) {
        if (response.status === 200) {
          const offers = response.data;
          console.log("Got offers:", offers);
          self.sendSocketNotification("OFFERS_RESULT", { offers: offers });
        } else {
          console.error(`Error getting offers: ${response.statusText}`);
          self.sendSocketNotification("OFFERS_RESULT", { error: response.statusText });
        }
      })
      .catch(function(error) {
        console.error(`Error getting offers: ${error}`);
        self.sendSocketNotification("OFFERS_RESULT", { error: error.message });
      });
  }
});
