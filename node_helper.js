const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({

  start: function() {
    console.log(`Starting module helper: ${this.name}`);
  },

  // Override socketNotificationReceived method.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_AUTH_TICKET") {
      this.getAuthTicket(payload);
    } else if (notification === "GET_CARD_ACCOUNTS") {
      this.getCardAccounts(payload);
    }
  },

  getAuthTicket: function(config) {
    console.log("Retrieving authentication ticket");

    const options = {
      method: "POST",
      url: `${config.apiUrl}/auth/ticket`,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "UserName": config.username,
        "Password": config.password
      })
    };

    request(options, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(`Error getting authentication ticket: ${error}`);
        this.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
        return;
      }

      const authTicket = JSON.parse(body).Ticket;
      if (!authTicket) {
        console.error("Error: Unable to retrieve authentication ticket.");
        this.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
        return;
      }

      console.log(`Got authentication ticket: ${authTicket}`);
      this.sendSocketNotification("AUTH_TICKET_RESULT", { authTicket: authTicket });
    });
  },

  getCardAccounts: function(options) {
    console.log("Retrieving card accounts");

    request(options, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error(`Error getting card accounts: ${error}`);
        this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error });
        return;
      }

      const cardAccounts = JSON.parse(body);
      if (!cardAccounts) {
        console.error("Error: Unable to retrieve card accounts.");
        this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: "Unable to retrieve card accounts." });
        return;
      }

      console.log(`Got card accounts: ${JSON.stringify(cardAccounts)}`);
      this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });
    });
  }

});
