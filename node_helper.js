const NodeHelper = require("node_helper");
const axios = require("axios");
const fs = require('fs'); // Include the File System module
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  start: function() {
    console.log(`ICA Starting helper: ${this.name}`);
    this.runPredictionScript(); // Run the Python script at startup
    setInterval(() => {
      this.runPredictionScript(); // Schedule the script to run periodically
    }, 24 * 60 * 60 * 1000); // Adjust the interval as needed

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

runPredictionScript: function() {
    console.log("Exporting: Attempting to run python script");

    const scriptCommand = "python /home/PI/MagicMirror/modules/MMM-ICA/saldoprediction.py";
    console.log(`ICA Running command: ${scriptCommand}`);

    exec(scriptCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`ICA Exporting: Error executing script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`ICA Exporting: Stderr from script: ${stderr}`);
            // Optional: You can still handle stdout even if there's stderr
        }

        console.log(`ICA Exporting: Python script output: ${stdout}`);
        this.sendSocketNotification("PREDICTION_RESULT", stdout.trim());
    });
},


  socketNotificationReceived: function(notification, payload) {
    console.log("ICA Received socket notification:", notification, "with payload:", payload);

    if (notification === "GET_AUTH_TICKET") {
      this.config = payload;
      console.log("ICA Retrieving authentication ticket");

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
            console.error("ICA Error: Unable to retrieve authentication ticket.");
            self.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
            return;
          }

          console.log(`ICA Got authentication ticket: ${authTicket}`);
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
          console.error(`ICA Error getting authentication ticket: ${response.statusText}`);
          self.sendSocketNotification("AUTH_TICKET_RESULT", { error: response.statusText });
        }
      })
      .catch(function(error) {
        console.error(`ICA Error getting authentication ticket: ${error}`);
        self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error.message });
      });
  },

  makeCardAccountsRequest: function(options) {
    const self = this;
    axios(options)
      .then(function(response) {
        if (response.status === 200) {
          const cardAccounts = response.data;
          console.log("ICA Got card accounts:", cardAccounts);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { cardAccounts: cardAccounts });
          self.exportSaldoData(cardAccounts); // Call exportSaldoData here
        } else {
          console.error(`ICA Error getting card accounts: ${response.statusText}`);
          self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: response.statusText });
        }
      })
      .catch(function(error) {
        console.error(`ICA Error getting card accounts: ${error}`);
        self.sendSocketNotification("CARD_ACCOUNTS_RESULT", { error: error.message });
      });
  },

exportSaldoData: function (cardAccounts) {
    console.log("ICA Exporting saldo data in NodeHelper...");

    try {
        if (cardAccounts && cardAccounts.Cards) {
            const dataRows = [];

            for (const card of cardAccounts.Cards) {
                for (const account of card.Accounts) {
                    const date = new Date().toISOString().split('T')[0];
                    const saldo = account.Available;
                    const dataRow = `${date},${parseInt(saldo, 10)}`; // Convert saldo to an integer
                    dataRows.push(dataRow);
                }
            }

            if (dataRows.length > 0) {
                const dataToWrite = dataRows.join('\n') + '\n';
                const filePath = '/home/PI/saldo_data.csv';

                fs.appendFile(filePath, dataToWrite, (err) => {
                    if (err) {
                        console.error('ICA Error writing to file in NodeHelper:', err);
                    } else {
                        console.log(`ICA Saldo data exported to ${filePath} by NodeHelper`);
                    }
                });
            } else {
                console.error('ICA No saldo data available to export in NodeHelper.');
            }
        } else {
            console.error('ICA Card accounts data not available in NodeHelper.');
        }
    } catch (error) {
        console.error('ICA Error in NodeHelper exportSaldoData:', error);
    }
}

});
