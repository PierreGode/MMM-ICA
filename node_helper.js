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

      this.makeRequest(options, this.handleAuthTicketResult);
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const options = payload;
      this.makeRequest(options, this.handleCardAccountsResult);
    } else if (notification === "GET_STORES") {
      const options = payload;
      this.makeRequest(options, this.handleStoresResult);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  makeRequest: function(options, callback) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        callback.call(self, body);
      } else {
        console.error(`Error: ${error}`);
        self.sendSocketNotification(options.callbackNotification, { error: error });
      }
    });
  },

  handleAuthTicketResult: function(body) {
    const authTicket = JSON.parse(body).AuthenticationTicket;
    console.log(`Got authentication ticket: ${authTicket}`);
    if (!authTicket) {
      console.error("Error: Unable to retrieve authentication ticket.");
      this.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
      return;
    }
    this.authTicket = authTicket;
    const cardAccountsOptions = {
      method: "GET",
      url: `${this.config.apiUrl}/user/cardaccounts`,
      headers: {
        "AuthenticationTicket": authTicket
      }
    };
    this.makeRequest(cardAccountsOptions, this.handleCardAccountsResult);
  },

  handleCardAccountsResult: function(body) {
    try {
      const cardAccounts = JSON.parse(body);
      console.log("Got card accounts:", cardAccounts);
      this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });
    } catch (error) {
      console.error(`Error parsing card accounts JSON: ${error}`);
      this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
    }
  },

  handleStoresResult: function(body) {
    try {
      const stores = JSON.parse(body);
      console.log("Got stores:", stores);
      this.sendSocketNotification("STORES_RESULT", { stores: stores });
    } catch (error) {
      console.error(`Error parsing stores JSON: ${error}`);
      this.sendSocketNotification("STORES_RESULT", { error: error });
    }
  }
});
