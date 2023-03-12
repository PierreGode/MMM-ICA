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

        const cardAccountsOptions = {
          method: "GET",
          url: `${self.config.apiUrl}/user/cardaccounts`,
          headers: {
            "AuthenticationTicket": authTicket
          }
        };

        self.makeCardAccountsRequest(cardAccountsOptions, response);
      } else {
        console.error(`Error getting authentication ticket: ${error}`);
        self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
      }
    });
  },

  makeCardAccountsRequest: function(options, response) {
    var self = this;

    // Check if authentication ticket is still valid
    const now = new Date();
    const ticketExpiration = new Date(response.headers["authenticationticketexpiration"]);
    if (ticketExpiration < now) {
      console.log("Authentication ticket has expired, renewing ticket...");
      const authHeader = `Basic ${Buffer.from(`${self.config.username}:${self.config.password}`).toString("base64")}`;
      const authOptions = {
        method: "GET",
        url: `${self.config.apiUrl}/login`,
        headers: {
          "Authorization": authHeader
        }
      };

      // Retrieve new authentication ticket
      request(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          const authTicket = response.headers["authenticationticket"];
          console.log(`Got new authentication ticket: ${authTicket}`);
          self.authTicket = authTicket;

          // Update headers with new authentication ticket
          options.headers.AuthenticationTicket = authTicket;

          // Make request for card accounts with updated headers
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
              console.error(`Error renewing authentication ticket: ${error}`);
              self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
            }
          });
        } else {
          console.error(`Error getting authentication ticket: ${error}`);
          self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
        }
      });
    } else {
      // Authentication ticket is still valid, make request for card accounts
      request(options, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          const cardAccounts = JSON.parse(body);
          console.log("Got card accounts:", cardAccounts);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });

          // Check if user has any card accounts
          if (cardAccounts.length > 0) {
            // Get first card account for user
            const cardAccountId = cardAccounts[0].cardAccountId;
            console.log(`Getting transactions for card account ${cardAccountId}`);

            const transactionsOptions = {
              method: "GET",
              url: `${self.config.apiUrl}/user/cardaccounts/${cardAccountId}/transactions`,
              headers: {
                "AuthenticationTicket": self.authTicket
              }
            };

            self.makeTransactionsRequest(transactionsOptions);
          } else {
            console.log("User has no card accounts");
            self.sendSocketNotification("TRANSACTIONS_RESULT", { transactions: [] });
          }
        } else {
          console.error(`Error getting card accounts: ${error}`);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
        }
      });
    }
  },

  makeTransactionsRequest: function(options) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const transactions = JSON.parse(body);
        console.log("Got transactions:", transactions);
        self.sendSocketNotification("TRANSACTIONS_RESULT", { transactions: transactions });
      } else {
        console.error(`Error getting transactions: ${error}`);
        self.sendSocketNotification("TRANSACTIONS_RESULT", { error: error });
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
      } else {
        console.error(`Error getting favorite stores: ${error}`);
        self.sendSocketNotification("FAVORITE_STORES_RESULT", { error: error });
      }
    });
  }
});
