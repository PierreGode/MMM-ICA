Module.register("MMM-ICA", {
  defaults: {
    endpoints: [], // Array of endpoint configurations.
    updateInterval: 60 * 60 * 1000, // Update every hour.
    retryDelay: 5 * 60 * 1000 // Retry every 5 minutes if an error occurs.
  },

  start: function() {
    console.log("Module config:", this.config);
    Log.info(`Starting module: ${this.name}`);

    if (!this.config.endpoints || this.config.endpoints.length === 0) {
      console.error("Error: endpoints not provided in module config.");
      return;
    }

    // Initialize the endpoint data.
    this.endpointData = {};

    // Initialize the authentication tickets.
    this.authTickets = {};

    // Start the update cycle for each endpoint.
    this.config.endpoints.forEach((endpoint, index) => {
      // Set the initial state for the endpoint data.
      this.endpointData[index] = {};

      // Get the authentication ticket for the endpoint.
      if (!endpoint.username || !endpoint.password || !endpoint.apiUrl) {
        console.error(`Error: Invalid configuration for endpoint ${index}.`);
        return;
      }
      this.sendSocketNotification("GET_AUTH_TICKET", {index: index, config: endpoint});
    });
  },

  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "small bright";

    // Iterate over each endpoint to display the data.
    this.config.endpoints.forEach((endpoint, index) => {
      const endpointData = this.endpointData[index];
      const endpointWrapper = document.createElement("div");

      if (endpointData.cardAccounts) {
        endpointWrapper.innerHTML = `Endpoint ${index}: Saldo: ${endpointData.cardAccounts.Cards[0].Accounts[0].Balance}`;
      } else {
        endpointWrapper.innerHTML = `Endpoint ${index}: Loading content...`;
      }

      wrapper.appendChild(endpointWrapper);
    });

    return wrapper;
  },

  // Override socket notification handler.
  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "AUTH_TICKET_RESULT") {
      const index = payload.index;
      const config = this.config.endpoints[index];

      if (payload.error) {
        console.error(`Error getting authentication ticket for endpoint ${index}: ${payload.error}`);
        this.authTickets[index] = "";
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", {index: index, config: config});
        }, this.config.retryDelay);
        return;
      }

      const authTicket = payload.authTicket;
      if (!authTicket) {
        console.error(`Error: Unable to retrieve authentication ticket for endpoint ${index}.`);
        this.authTickets[index] = "";
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", {index: index, config: config});
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got authentication ticket for endpoint ${index}: ${authTicket}`);
      this.authTickets[index] = authTicket;

      // Schedule the first call to the card accounts API.
      setTimeout(() => {
        this.getCardAccounts(index);
      }, this.config.updateInterval);
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      const index = payload.index;
      const config = this.config.endpoints[index];

      if (payload.error) {
        console.error(`Error getting card accounts for endpoint ${index}: ${payload.error}`);
        setTimeout(() => {
          this.getCardAccounts(index);
        }, this.config.retryDelay);
        return;
      }
      const cardAccounts = payload.cardAccounts;
      if (!cardAccounts) {
        console.error(`Error: Unable to retrieve card accounts for endpoint ${index}.`);
        setTimeout(() => {
          this.getCardAccounts(index);
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got card accounts for endpoint ${index}: ${JSON.stringify(cardAccounts)}`);
      this.endpointData[index].cardAccounts = cardAccounts;

      // Schedule the next call to the card accounts API.
      setTimeout(() => {
        this.getCardAccounts(index);
      }, this.config.updateInterval);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  getCardAccounts: function(index) {
    console.log(`Retrieving card accounts for endpoint ${index}`);

    const endpoint = this.config.endpoints[index];
    const authTicket = this.authTickets[index];

    const options = {
      method: "GET",
      url: `${endpoint.apiUrl}/user/cardaccounts`,
      headers: {
        "AuthenticationTicket": authTicket
      }
    };

    this.sendSocketNotification("GET_CARD_ACCOUNTS", {index: index, options: options});
  }
});
