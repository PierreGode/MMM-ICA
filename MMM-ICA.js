Module.register("MMM-ICA", {
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    storeApiUrl: "",
    updateNotification: "UPDATE_ICA_MODULE",
    updateInterval: 10 * 60 * 1000, // Update every 10 minutes.
    retryDelay: 5 * 60 * 1000, // Retry every 5 minutes if an error occurs.
    settings: {
      Saldo: true,
      AccountName: true,
      FavoriteStores: true,
      offers: true, // Add this line to enable the offers feature
      DisplayStoreID: true, // Add this line to include the setting
    },
    offersStoreId: "", // Default store ID for which offers will be displayed
    dataExportPath: "/home/PI/saldo_data.csv", // Specify the export file path
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

    // Ensure that there's only one interval running for getCardAccounts
    if (this.cardAccountsInterval) {
      clearInterval(this.cardAccountsInterval);
    }
    this.cardAccountsInterval = setInterval(() => {
      this.getCardAccounts();
    }, this.config.updateInterval);
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

      if (this.config.settings.FavoriteStores && this.favoriteStores) {
        const favoriteStoresDiv = document.createElement("div");
        const favoriteStores = this.favoriteStores.FavoriteStores.join();
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

    if (this.config.settings.offers && this.offers) {
      const offersDiv = document.createElement("div");
      const filteredOffers = this.offers.filter(offer => offer.StoreId.toString() === this.config.offersStoreId);
      if (filteredOffers.length > 0) {
        offersDiv.innerHTML = `Offers:<br>`;
        const offersList = document.createElement("ul");
        filteredOffers.forEach(offer => {
          const listItem = document.createElement("li");
          listItem.innerHTML = `${offer.HeaderText} - ${offer.OfferCondition}`;
          offersList.appendChild(listItem);
        });
        offersDiv.appendChild(offersList);
        wrapper.appendChild(offersDiv);
      } else {
        const noOffersDiv = document.createElement("div");
        noOffersDiv.innerHTML = "No offers available for the specified store ID.";
        wrapper.appendChild(noOffersDiv);
      }
    }

    return wrapper;
  },

  // Override socket notification handler.
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

      // Schedule the first call to the card accounts API.
      setInterval(() => {
        this.getCardAccounts();
      }, this.config.updateInterval);
    } else if (notification === "CARD_ACCOUNTS_RESULT") {
      if (payload.error) {
        console.error(`Error getting card accounts: ${payload.error}`);
        setInterval(() => {
          this.getCardAccounts();
        }, this.config.retryDelay);
        return;
      }

      const cardAccounts = payload.cardAccounts;
      if (!cardAccounts) {
        console.error("Error: Unable to retrieve card accounts.");
        setInterval(() => {
          this.getCardAccounts();
        }, this.config.retryDelay);
        return;
      }

      console.log("Got card accounts:", cardAccounts);
      this.cardAccounts = cardAccounts;
      this.updateDom(1000);

      // Export saldo data to CSV
      this.exportSaldoData();
    } else if (notification === "FAVORITE_STORES_RESULT") {
      if (payload.error) {
        console.error(`Error getting favorite stores: ${payload.error}`);
        return;
      }

      const favoriteStores = payload.favoriteStores;
      if (!favoriteStores) {
        console.error("Error: Unable to retrieve favorite stores.");
        return;
      }

      console.log("Got favorite stores:", favoriteStores);
      this.favoriteStores = favoriteStores;
      this.updateDom();
    } else if (notification === "OFFERS_RESULT") {
      if (payload.error) {
        console.error(`Error getting offers: ${payload.error}`);
        return;
      }

      const offers = payload.offers;
      if (!offers) {
        console.error("Error: Unable to retrieve offers.");
        return;
      }

      console.log("Got offers:", offers);
      this.offers = offers;
      this.updateDom(1000);
    }
  },

  exportSaldoData: function () {
    const fs = require('fs'); // Import the Node.js fs module for file operations

    // Check if saldo data exists
    if (this.cardAccounts) {
      // Create an array to hold the data rows
      const dataRows = [];

      // Loop through the card accounts
      for (const card of this.cardAccounts.Cards) {
        for (const account of card.Accounts) {
          // Extract relevant data fields
          const date = new Date().toISOString().split('T')[0]; // Get the current date
          const saldo = account.Available;

          // Create a data row in the required format
          const dataRow = `${date},${saldo}`;

          // Push the data row to the array
          dataRows.push(dataRow);
        }
      }

      // Join the data rows with line breaks
      const dataToWrite = dataRows.join('\n');

      // Get the export file path from the configuration
      const exportFilePath = this.config.dataExportPath;

      // Write the data to the specified file
      fs.writeFileSync(exportFilePath, dataToWrite);

      console.log(`Saldo data exported to ${exportFilePath}`);
    } else {
      console.error('No saldo data available to export.');
    }
  },
});
