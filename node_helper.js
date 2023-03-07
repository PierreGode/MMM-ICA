// node_helper.js
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
    } else if (notification === "GET_STORES") {
      const options = payload;
      console.log("Retrieving stores");

      this.makeRequest(options, "STORES_RESULT");
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const options = payload;
      console.log("Retrieving card accounts");

      this.makeRequest(options, "CARD_ACCOUNTS_RESULT");
    }
  },

  makeRequest: function(options, resultNotification) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const result = JSON.parse(body);
        console.log(`Got result: ${JSON.stringify(result)}`);
        self.sendSocketNotification(resultNotification, { [resultNotification.toLowerCase().replace("_result", "")]: result });
      } else {
        console.error(`Error getting data: ${error}`);
        self.sendSocketNotification(resultNotification, { error: error });
      }
    });
  }
});
