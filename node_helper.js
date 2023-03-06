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
    } else if (notification === "GET_CARD_ACCOUNTS") {
      const options = payload;
      options.headers["AuthenticationTicket"] = this.authTicket;

      this.makeRequest(options, "CARD_ACCOUNTS_RESULT");
    } else if (notification === "GET_STORES") {
      const options = {
        method: "GET",
        url: `${this.config.storeApiUrl}/user/stores`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };

      this.makeRequest(options, "STORES_RESULT");
    } else if (notification === "GET_MINBONUS_TRANSACTIONS") {
      const options = {
        method: "GET",
        url: `${this.config.apiUrl}/user/minbonustransaction`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };

      this.makeRequest(options, "MINBONUS_TRANSACTIONS_RESULT");
    } else if (notification === "GET_OFFERS") {
      const options = {
        method: "GET",
        url: `${this.config.apiUrl}/offers?Stores=${payload.storeId}`,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };

      this.makeRequest(options, "OFFERS_RESULT");
    }
  },

  makeRequest: function(options, resultNotification) {
    var self = this;
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const result = JSON.parse(body);
        console.log(`Got ${resultNotification}:`, result);
        self.sendSocketNotification(resultNotification, { result: result });
      } else {
        console.error(`Error getting ${resultNotification}: ${error}`);
        self.sendSocketNotification(resultNotification, { error: error });
      }
    });
  },

  getAuthTicket: function() {
    console.log("Retrieving authentication ticket");

    const authHeader = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`;
    const options = {
      method: "GET",
      url: `${this.config.apiUrl}/login`,
      headers: {
        "Authorization": authHeader
      }
    };

    this.makeRequest(options, "AUTH_TICKET_RESULT");
  },

  startRequests: function() {
    // Schedule the first call to the card accounts API.
    setTimeout(() => {
      this.getCardAccounts();
    }, this.config.updateInterval);

    // Schedule the first call to the stores API.
    setTimeout(() => {
      this.getStores();
    }, this.config.updateInterval);

    // Schedule the first call to the minbonus transactions API.
    setTimeout(() => {
      this.getMinBonusTransactions();
    }, this.config.updateInterval);

    // Schedule the first call to the offers API.
    setTimeout(() => {
      this.getOffers();
    }, this.config.updateInterval);
  },

           .filter(o => o.CategoryName === "Matvaror")
          .slice(0, this.config.offerLimit)
          .map(o => ({
            name: o.Name,
            price: o.Price,
            priceBeforeDiscount: o.OriginalPrice,
            discount: o.SavingsText,
            imageUrl: o.ImageUrl
          }));
        console.log(`Got offers: ${JSON.stringify(offers)}`);
        this.offers = offers;
        this.updateDom();

        // Schedule the next call to the offers API.
        setTimeout(() => {
          this.getOffers();
        }, this.config.updateInterval);
      } else {
        console.error(`Error getting offers: ${payload.error}`);
        setTimeout(() => {
          this.getOffers();
        }, this.config.retryDelay);
      }
    },

    getOffers: function() {
      console.log("Retrieving offers");

      let url = `${this.config.apiUrl}/offers`;
      if (this.config.settings.apiEndpoints.offers.storeId) {
        url += `?Stores=${this.config.settings.apiEndpoints.offers.storeId}`;
      }

      const options = {
        method: "GET",
        url: url,
        headers: {
          "AuthenticationTicket": this.authTicket
        }
      };

      this.sendSocketNotification("GET_OFFERS", options);
    }
  });
