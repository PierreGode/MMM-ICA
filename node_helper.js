const NodeHelper = require("node_helper");
const axios = require("axios");
const fs = require('fs'); // Include the File System module

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
          self.exportSaldoData(cardAccounts); // Call exportSaldoData here
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

  exportSaldoData: function (cardAccounts) {
    console.log("Exporting saldo data in NodeHelper...");

    try {
      if (cardAccounts && cardAccounts.Cards) {
        const dataRows = [];

        for (const card of cardAccounts.Cards) {
          for (const account of card.Accounts) {
            const date = new Date().toISOString().split('T')[0];
            const saldo = account.Available;
            const dataRow = `${date},${saldo}`;
            dataRows.push(dataRow);
          }
        }

        if (dataRows.length > 0) {
          const dataToWrite = dataRows.join('\n') + '\n';
          const filePath = '/home/PI/saldo_data.csv';

          fs.appendFile(filePath, dataToWrite, (err) => {
            if (err) {
              console.error('Error writing to file in NodeHelper:', err);
            } else {
              console.log(`Saldo data exported to ${filePath} by NodeHelper`);
            }
          });
        } else {
          console.error('No saldo data available to export in NodeHelper.');
        }
      } else {
        console.error('Card accounts data not available in NodeHelper.');
      }
    } catch (error) {
      console.error('Error in NodeHelper exportSaldoData:', error);
    }
  }
});
