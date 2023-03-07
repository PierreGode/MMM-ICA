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

      this.makeRequest(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const authTicket = response.headers["authenticationticket"];
          console.log(response.headers); // Add this line
          if (!authTicket) {
            console.error("Error: Unable to retrieve authentication ticket.");
            this.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
            return;
          }

          console.log(`Got authentication ticket: ${authTicket}`);
          this.authTickets[payload.index] = authTicket;

          const cardAccountsOptions = {
            method: "GET",
            url: `${payload.apiUrl}/user/cardaccounts`,
            headers: {
              "AuthenticationTicket": authTicket
            }
          };

          this.makeCardAccountsRequest(payload.index, cardAccountsOptions);
        } else {
          console.error(`Error getting authentication ticket: ${error}`);
          this.sendSocketNotification("AUTH_TICKET_RESULT", { index: payload.index, error: error });
        }
      });
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const index = payload.index;
      const options = payload.options;

      console.log(`Retrieving card accounts for endpoint ${index}`);

      this.makeRequest(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const cardAccounts = JSON.parse(body);
          console.log(`Got card accounts for endpoint ${index}:`, cardAccounts);
          this.endpointData[index].cardAccounts = cardAccounts;

          this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { index: index, cardAccounts: cardAccounts });
        } else {
          console.error(`Error getting card accounts for endpoint ${index}: ${error}`);
          this.sendSocketNotification("CARD_ACCOUNTS_RESULT", { index: index, error: error });
        }
      });
    }
  },

  makeRequest: function(options, callback) {
    request(options, callback);
  },
    createTransaction: function(cardAccountIndex, transactionData) {
    const endpointIndex = this.config.cardAccounts[cardAccountIndex].endpointIndex;
    const cardAccountId = this.endpointData[endpointIndex].cardAccounts[cardAccountIndex].id;

    const transactionOptions = {
      method: "POST",
      url: `${this.config.apiUrl}/user/cardaccounts/${cardAccountId}/transactions`,
      headers: {
        "AuthenticationTicket": this.authTickets[endpointIndex],
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transactionData)
    };

    console.log(`Creating transaction for card account ${cardAccountId}:`, transactionData);
    this.makeRequest(transactionOptions, (error, response, body) => {
      if (!error && response.statusCode === 201) {
        console.log(`Transaction created for card account ${cardAccountId}.`);
        this.sendSocketNotification("TRANSACTION_CREATED", { cardAccountIndex: cardAccountIndex, transaction: transactionData });
      } else {
        console.error(`Error creating transaction for card account ${cardAccountId}: ${error}`);
        this.sendSocketNotification("TRANSACTION_CREATED", { cardAccountIndex: cardAccountIndex, error: error });
      }
    });
  },

  getEndpointData: function() {
    const endpointData = [];
    const endpointCount = this.config.endpoints.length;

    for (let i = 0; i < endpointCount; i++) {
      endpointData.push({
        endpoint: this.config.endpoints[i],
        cardAccounts: []
      });
    }

    return endpointData;
  }
});
