Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateInterval: 60 * 60 * 1000,
    retryDelay: 10 * 60 * 1000,
    apiEndpoints: {
      stores: true,
      minbonus: true,
      offers: ""
    }
  },

  start: function() {
    console.log("Module config:", this.config);
    Log.info(`Starting module: ${this.name}`);

    if (!this.config.username || !this.config.password) {
      console.error("Error: username or password not provided in module config.");
      this.authTicket = "";
      this.updateDom();
      return;
    }

    this.sendSocketNotification("GET_AUTH_TICKET", this.config);
  },

  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "small bright";

    if (this.cardAccounts) {
      const apiEndpoints = this.config.apiEndpoints;

      if (apiEndpoints.minbonus) {
        wrapper.innerHTML = `Min bonus: ${this.cardAccounts.minBonus}`;
      } else if (apiEndpoints.stores) {
        const stores = this.cardAccounts.stores;
        const storeList = stores.map((store) => `${store.StoreId} - ${store.Name}`).join("<br>");
        wrapper.innerHTML = `Stores:<br>${storeList}`;
      } else if (apiEndpoints.offers) {
        const offers = this.cardAccounts.offers.Offers;
        const offerList = offers.map((offer) => `${offer.Title} (${offer.Price} kr)`).join("<br>");
        wrapper.innerHTML = `Offers:<br>${offerList}`;
      } else {
        wrapper.innerHTML = "Invalid API endpoint configuration.";
      }
    } else {
      wrapper.innerHTML = "Loading content...";
    }

    return wrapper;
  },

  socketNotificationReceived: function(notification, payload) {
    console.log("Received socket notification:", notification, "with payload:", payload);

    if (notification === "AUTH_TICKET_RESULT") {
      if (payload.error) {
        console.error(`Error getting authentication ticket: ${payload.error}`);
        this.authTicket = "";
        this.updateDom();
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", this.config);
        }, this.config.retryDelay);
        return;
      }

      const authTicket = payload.authTicket;
      if (!authTicket) {
        console.error("Error: Unable to retrieve authentication ticket.");
        this.authTicket = "";
        this.updateDom();
        setTimeout(() => {
          this.sendSocketNotification("GET_AUTH_TICKET", this.config);
        }, this.config.retryDelay);
        return;
      }

      console.log(`Got authentication ticket: ${authTicket}`);
      this.authTicket = authTicket;
      this.updateDom();

      setTimeout(() => {
        this.getCardAccounts();
      }, this.config.updateInterval);
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      if (payload.error) {
        console.error(`Error getting card accounts: ${payload.error}`);
        setTimeout(() => {
          this.getCardAccounts();
        }, this.config.retryDelay);
        return;
      }

      const apiEndpoints = this.config.apiEndpoints;
      let cardAccounts = {};

      if (apiEndpoints.minbonus) {
        cardAccounts.minBonus = payload.minBonus;
      }

      if (apiEndpoints.stores) {
        cardAccounts.stores = payload.stores;
      }

      if (apiEndpoints.offers) {
        const storeId = apiEndpoints.offers;
        const offers = payload.offers.filter((offer) => offer;
               .find((store) => store.StoreId === storeId)
          .Offers;
        cardAccounts.offers = { Offers: offers };
      }

      console.log(`Got card accounts: ${JSON.stringify(cardAccounts)}`);
      this.cardAccounts = cardAccounts;
      this.updateDom();

      setTimeout(() => {
        this.getCardAccounts();
      }, this.config.updateInterval);
    } else {
      console.warn(`Unknown socket notification received: ${notification}`);
    }
  },

  getCardAccounts: function() {
    console.log("Retrieving card accounts");

    const apiEndpoints = this.config.apiEndpoints;
    const options = {
      method: "GET",
      url: "",
      headers: {
        "AuthenticationTicket": this.authTicket
      }
    };

    if (apiEndpoints.minbonus) {
      options.url = `${this.config.apiUrl}/user/minbonustransaction`;
    } else if (apiEndpoints.stores) {
      options.url = `${this.config.apiUrl}/stores`;
    } else if (apiEndpoints.offers) {
      options.url = `${this.config.storeApiUrl}/offers`;
    } else {
      console.error("Error: Invalid API endpoint configuration.");
      return;
    }

    this.sendSocketNotification("GET_CARD_ACCOUNTS", options);
  }
});

        
