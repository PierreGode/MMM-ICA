const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
  start: function() {
    console.log(`Starting helper: ${this.name}`);
    this.authTicket = "";
    this.cardAccounts = null;
    this.favoriteStores = null;
    this.updateTimer = null;
    this.authTimer = null;
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
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const self = this;
      request(payload, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          const cardAccounts = JSON.parse(body);
          console.log("Got card accounts:", cardAccounts);
          self.cardAccounts = cardAccounts;
          self.updateDom();

          // Schedule the next call to the card accounts API.
          self.scheduleUpdate();
        } else {
          console.error(`Error getting card accounts: ${error}`);
          self.scheduleRetry("getCardAccounts");
        }
      });
    } else if (notification === "GET_FAVORITE_STORES") {
      const self = this;
      request(payload, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          const favoriteStores = JSON.parse(body);
          console.log("Got favorite stores:", favoriteStores);
          self.favoriteStores = favoriteStores;
          self.updateDom();

          // Schedule the next call to the favorite stores API.
          self.scheduleUpdate();
        } else {
          console.error(`Error getting favorite stores: ${error}`);
          self.scheduleRetry("getFavoriteStores");
        }
      });
    }
  },

  makeRequest: function(options) {
    const self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const authTicket = response.headers["authenticationticket"];
        console.log(response.headers); // Add this line
        if (!authTicket) {
          console.error("Error: Unable to retrieve authentication ticket.");
          self.sendSocketNotification("AUTH_TICKET_RESULT", { error: "Unable to retrieve authentication ticket." });
          self.scheduleRetry("getAuthTicket");
          return;
        }

        console.log(`Got authentication ticket: ${authTicket}`);
        self.authTicket = authTicket;
        self.updateDom();

        // Schedule the first call to the card accounts API.
        self.scheduleUpdate();
        // Schedule the next call to the authentication API.
        self.scheduleAuth();
      } else {
        console.error(`Error getting authentication ticket: ${error}`);
        self.sendSocketNotification("AUTH_TICKET_RESULT", { error: error });
        self.scheduleRetry("getAuthTicket");
      }
    });
  },

  scheduleUpdate: function() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.getCardAccounts();
      this.getFavoriteStores();
    }, this.config.updateInterval);
  },
  scheduleAuth: function() {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
    }
    this.authTimer = setTimeout(() => {
      this.sendSocketNotification("GET_AUTH_TICKET", this.config);
    }, this.config.updateInterval - 5 * 60 * 1000); // Authenticate 5 minutes before token expires.
  },

  scheduleRetry: function(funcName) {
    const self = this;
    setTimeout(() => {
      console.log(`Retrying ${funcName}`);
      self[funcName]();
    }, this.config.retryDelay);
  },

  updateDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "small bright";

    if (this.cardAccounts) {
      if (this.config.settings.Saldo) {
        const saldoDiv = document.createElement("div");
        saldoDiv.innerHTML = `Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Available}`;
        wrapper.appendChild(saldoDiv);
      }

      if (this.config.settings.AccountName) {
        const accountNameDiv = document.createElement("div");
        accountNameDiv.innerHTML = `Account Name: ${this.cardAccounts.Cards[0].Accounts[0].AccountName}`;
        wrapper.appendChild(accountNameDiv);
      }

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores.join();
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores}`;
        wrapper.appendChild(favoriteStoresDiv);
      }

    } else {
      wrapper.innerHTML = "Loading content...";
    }

    this.sendSocketNotification("DOM_OBJECTS", wrapper.innerHTML);
  }
});

