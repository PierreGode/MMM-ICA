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

      this.makeRequest(options, notification);
    } else if (notification === "GET_CARD_ACCOUNTS" || notification === "GET_MIN_BONUS" || notification === "GET_STORES" || notification === "GET_OFFERS") {
      const options = payload;
      this.makeRequest(options, notification);
    }
  },

  makeRequest: function(options, notification = "") {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        if (notification === "GET_AUTH_TICKET") {
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

          self.makeRequest(cardAccountsOptions, "CARD_ACCOUNTS_RESULT");

          if (self.config.settings.apiEndpoints.minbonus) {
            const minBonusOptions = {
              method: "GET",
              url: `${self.config.apiUrl}/user/minbonustransaction`,
              headers: {
                "AuthenticationTicket": authTicket
              }
            };
            self.makeRequest(minBonusOptions, "MIN_BONUS_RESULT");
          }

          if (self.config.settings.apiEndpoints.stores) {
            const storesOptions = {
              method: "GET",
              url: `${self.config.storeApiUrl}/user/stores`,
              headers: {
                "AuthenticationTicket": authTicket
              }
            };
            self.makeRequest(storesOptions, "STORES_RESULT");
          }

          if (self.config.settings.apiEndpoints.showoffer && self.config.settings.apiEndpoints.offerstoreid) {
            const offersOptions = {
              method: "GET",
              url: `${self.config.apiUrl}/offers?Stores=${self.config.settings.apiEndpoints.offerstoreid}`,
              headers: {
                "AuthenticationTicket": authTicket
              }
            };
            self.makeRequest(offersOptions, "OFFERS_RESULT");
          }
        } else {
          const result = JSON.parse(body);
          self.sendSocketNotification(`${notification}`, { [`${notification.toLowerCase().replace("get_", "")}`]: result });
        }
      } else {
        console.error(`Error getting ${notification.toLowerCase().replace("get_", "")}: ${error}`);
        self.sendSocketNotification(`${notification}_RESULT`, { error: error });
      }
    });
  }
});
