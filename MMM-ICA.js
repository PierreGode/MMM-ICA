Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateNotification: "UPDATE_ICA_MODULE",
    updateInterval: 10 * 60 * 1000, // Update every 10 minutes
    retryDelay: 5 * 60 * 1000, // Retry delay
    settings: {
      Saldo: true,
      AccountName: true,
      FavoriteStores: true,
      DisplayStoreID: true,
    },
    offersStoreId: "",
    predictedSaldo: null, // Added for predicted saldo
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

    if (this.cardAccountsInterval) {
      clearInterval(this.cardAccountsInterval);
    }
    this.cardAccountsInterval = setInterval(() => {
      this.getCardAccounts();
    }, this.config.updateInterval);
  },

  getCardAccounts: function() {
    // Logic to get card accounts, if any
  },

  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.className = "small bright";

    if (this.cardAccounts) {
      if (this.config.settings.Saldo) {
        const saldoDiv = document.createElement("div");
        saldoDiv.innerHTML = `Tillgängligt Saldo: ${this.cardAccounts.Cards[0].Accounts[0].Available}`;
        wrapper.appendChild(saldoDiv);
      }

      if (this.config.settings.AccountName) {
        const accountNameDiv = document.createElement("div");
        accountNameDiv.innerHTML = `Account Name: ${this.cardAccounts.Cards[0].Accounts[0].AccountName}`;
        wrapper.appendChild(accountNameDiv);
      }

      if (this.config.predictedSaldo !== null) {
        this.displayPredictedSaldo(wrapper);
      }

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores.join(", ");
        favoriteStoresDiv.innerHTML = `Favorite Stores: ${favoriteStores}`;
        wrapper.appendChild(favoriteStoresDiv);
      }

      if (this.config.settings.DisplayStoreID) {
        const storeIDDiv = document.createElement("div");
        storeIDDiv.innerHTML = `Store ID: ${this.config.offersStoreId}`;
        wrapper.appendChild(storeIDDiv);
      }
    } else {
      wrapper.innerHTML = "<span class='small fa fa-refresh fa-spin fa-fw'></span>";
      wrapper.className = "small dimmed";
    }

    return wrapper;
  },

displayPredictedSaldo: function(wrapper) {
    const predictedSaldoDiv = document.createElement("div");
    predictedSaldoDiv.innerHTML = `Gissad saldo den sista: ${this.config.predictedSaldo}`;
    wrapper.appendChild(predictedSaldoDiv);
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

      const authTicket = payload.authenticationTicket;
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

      this.getCardAccounts(); // Call to fetch card accounts
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      if (payload.error) {
        console.error(`Error getting card accounts: ${payload.error}`);
        this.updateDom();
        return;
      }

      const cardAccounts = payload.cardAccounts;
      if (!cardAccounts) {
        console.error("Error: Unable to retrieve card accounts.");
        this.updateDom();
        return;
      }

      console.log("Got card accounts:", cardAccounts);
      this.cardAccounts = cardAccounts;
      this.updateDom(1000);
      console.error("Error:Exporting: Unable to retrieve card information.");
    } else if (notification === "PREDICTION_RESULT") {
      console.log(`Exporting: ${payload}`);
      this.config.predictedSaldo = payload; // Assuming payload is the predicted saldo
      this.updateDom();
    }
  },
});
