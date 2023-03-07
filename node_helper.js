const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
  start: function() {
    console.log(`Starting helper: ${this.name}`);
  },

  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "GET_AUTH_TICKET") {
      const index = payload.index;
      const config = payload.config;
      console.log(`Retrieving authentication ticket for endpoint ${index}`);

      const authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
      const options = {
        method: "GET",
        url: `${config.apiUrl}/login`,
        headers: {
          "Authorization": authHeader
        }
      };

      this.makeRequest(index, options);
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const index = payload.index;
      const options = payload.options;
      console.log(`Retrieving card accounts for endpoint ${index}`);

      this.makeRequest(index, options);
    }
  },

  makeRequest: function(index, options) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const authTicket = response.headers["authenticationticket"];
        console.log(`Got authentication ticket for endpoint ${index}: ${authTicket}`);
        if (!authTicket) {
          console.error(`Error: Unable to retrieve authentication ticket for endpoint ${index}.`);
          self.sendSocketNotification("AUTH_TICKET_RESULT", { index: index, error: "Unable to retrieve authentication ticket." });
          return;
        }

        self.sendSocketNotification("AUTH_TICKET_RESULT", { index: index, authTicket: authTicket });

        if (options.url.endsWith("/login")) {
          // This was an authentication request, so we need to retrieve the card accounts.
          const cardAccountsOptions = {
            method: "GET",
            url: `${options.url.substring(0, options.url.length - 6)}/user/cardaccounts`,
            headers: {
              "AuthenticationTicket": authTicket
            }
          };
          self.makeRequest(index, cardAccountsOptions);
        } else {
          // This was a card accounts request, so we need to parse the data and send it to the client.
          const cardAccounts = JSON.parse(body);
          console.log(`Got card accounts for endpoint ${index}: ${JSON.stringify(cardAccounts)}`);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { index: index, cardAccounts: cardAccounts });
        }
      } else {
        console.error(`Error getting data for endpoint ${index}: ${error}`);
        if (options.url.endsWith("/login")) {
          self.sendSocketNotification("AUTH_TICKET_RESULT", { index: index, error: error });
        } else {
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { index: index, error: error });
        }
      }
    });
  }
});
