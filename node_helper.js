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
      // Schedule a refresh of the authentication ticket every 60 minutes
      setInterval(() => {
        console.log("Refreshing authentication ticket");
        this.makeRequest(options);
      }, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds
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

      self.makeCardAccountsRequest(cardAccountsOptions);

      // Schedule the next refresh 60 minutes after this request completes
      setTimeout(() => {
        console.log("Refreshing authentication ticket");
        self.makeRequest(options);
      }, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds
    } else {
      console.error(`Error getting authentication ticket: ${error}`);
      self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
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
