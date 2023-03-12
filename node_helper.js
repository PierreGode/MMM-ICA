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
      if (notification === "GET_TRANSACTIONS") {
        console.log("Retrieving transactions");

        if (!this.authTicket) {
          console.log("No authentication ticket found, getting a new one...");
          this.sendSocketNotification("GET_AUTH_TICKET", this.config);
        } else {
          const options = {
            method: "GET",
            url: `${this.config.apiUrl}/user/cardaccounts/${payload.cardAccountId}/transactions`,
            headers: {
              "AuthenticationTicket": this.authTicket
            }
          };

          this.makeTransactionsRequest(options);
        }
      }
    },

    makeTransactionsRequest: function(options) {
      var self = this;
      request(options, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          const transactions = JSON.parse(body);
          console.log(`Got ${transactions.length} transactions`);

          // Format the transactions and send them to the client
          const formattedTransactions = self.formatTransactions(transactions);
          self.sendSocketNotification("TRANSACTIONS_RESULT", { transactions: formattedTransactions });
        } else {
          console.error(`Error getting transactions: ${error}`);
          self.sendSocketNotification("TRANSACTIONS_RESULT", { error: error });
        }
      });
    },

    formatTransactions: function(transactions) {
      const formattedTransactions = [];

      transactions.forEach(transaction => {
        const formattedTransaction = {
          date: new Date(transaction.timestamp),
          merchant: transaction.merchant.name,
          amount: transaction.amount.value,
          currency: transaction.amount.currency
        };
        formattedTransactions.push(formattedTransaction);
      });

      return formattedTransactions;
    }
  });
