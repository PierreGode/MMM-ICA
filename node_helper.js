const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
  start: function () {
    console.log("Starting node_helper for module [" + this.name + "]");
    this._isRunning = false;
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "FETCH_ICA_ARTICLES":
        if (!this._isRunning) {
          this._fetchICAArticles(payload);
        }
        break;
      default:
        console.log("Unknown notification: " + notification);
        break;
    }
  },

  _fetchICAArticles: function (config) {
    this._isRunning = true;
    const url = config.apiUrl + "user/commonarticles";
    const options = {
      url: url,
      headers: {
        "AuthenticationTicket": config.authenticationTicket
      }
    };
    const self = this;
    request.get(options, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const articles = JSON.parse(body).CommonArticles;
        self._isRunning = false;
        self.sendSocketNotification("FETCH_ICA_ARTICLES_COMPLETE", articles);
      } else {
        console.log("Error fetching ICA articles:", error);
        self._isRunning = false;
      }
    });
  }
});
const NodeHelper = require("node_helper");
const request = require("request");
const crypto = require("crypto");

module.exports = NodeHelper.create({

  start: function() {
    console.log("Starting module: " + this.name);
    this.config = null;
    this.token = null;
    this.tokenExpiration = null;
    this.cookie = null;
    this.sessionId = null;
    this.searchResults = [];
    this.recipeFilters = [];
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.login();
      setInterval(() => this.refreshToken(), this.config.tokenRefreshInterval);
    }
    if (notification === "SEARCH_RECIPES") {
      this.searchRecipes(payload);
    }
    if (notification === "GET_RECIPE") {
      this.getRecipe(payload);
    }
    if (notification === "GET_FILTERS") {
      this.getFilters();
    }
    if (notification === "GET_CATEGORY_RECIPES") {
      this.getCategoryRecipes(payload);
    }
    if (notification === "GET_RANDOM_RECIPES") {
      this.getRandomRecipes(payload);
    }
  },

  login: function() {
    const url = this.config.apiUrl + "auth/login";
    const username = this.config.username;
    const password = this.config.password;
    const hashedPassword = crypto.createHash("sha512").update(password).digest("hex");
    const options = {
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Username: username,
        Password: hashedPassword
      })
    };
    request(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        const data = JSON.parse(body);
        this.token = data.AccessToken;
        this.tokenExpiration = new Date(data.Expires).getTime();
        this.cookie = response.headers["set-cookie"];
        this.sessionId = response.headers["set-cookie"].find(cookie => cookie.includes("sessionid")).split(";")[0];
      }
      else {
        console.log(`Error: ${error}, statusCode: ${response.statusCode}, body: ${body}`);
      }
    });
  },
class ICANodeHelper extends NodeHelper {
  constructor() {
    super();

    this.config = {};
    this.cookies = null;
    this.token = null;
    this.user = null;
    this.listCache = {};
    this.recipeCache = {};
    this.categoryCache = {};
    this.searchCache = {};
    this.articleCache = {};
  }

  start() {
    console.log(`Starting node helper for module: ${this.name}`);
    this.expressApp.get('/icahandla/:listId?', this.listHandler.bind(this));
    this.expressApp.get('/icahandla/:listId/categories', this.categoryHandler.bind(this));
    this.expressApp.get('/icahandla/:listId/search/:query', this.searchHandler.bind(this));
    this.expressApp.get('/icahandla/article/:ean', this.articleHandler.bind(this));
    this.expressApp.get('/icahandla/recipe/:recipeId', this.recipeHandler.bind(this));
  }

  async socketNotificationReceived(notification, payload) {
    if (notification === 'CONFIG') {
      this.config = payload;
      await this.refreshCookies();
      await this.refreshToken();
      await this.refreshUser();
      await this.startTimer();
    }
  }

  async startTimer() {
    setInterval(async () => {
      await this.refreshCookies();
      await this.refreshToken();
      await this.refreshUser();
    }, this.config.updateInterval);

    setInterval(async () => {
      await this.refreshCookies();
      await this.refreshToken();
      await this.refreshUser();
    }, this.config.retryDelay);
  }

  async refreshCookies() {
    const { username, password, apiUrl } = this.config;
    try {
      const response = await axios.get(`${apiUrl}session/start`, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.status === 200) {
        this.cookies = response.headers['set-cookie'].join(';');
        const data = {
          personnummer: username,
          password,
          checkoutUrl: null,
          ignoreBlockedCheckout: true
        };

        const options = {
          headers: {
            Cookie: this.cookies
          },
          withCredentials: true
        };

        await axios.post(`${apiUrl}session/login`, data, options);
      }
    } catch (error) {
      console.error(`Error in refreshCookies: ${error}`);
    }
  }

  async refreshToken() {
    const { apiUrl } = this.config;
    try {
      const options = {
        headers: {
          Cookie: this.cookies
        },
        withCredentials: true
      };
      const response = await axios.post(`${apiUrl}session/token`, null, options);

      if (response.status === 200) {
        this.token = response.data.token;
      }
    } catch (error) {
      console.error(`Error in refreshToken: ${error}`);
    }
  }

  async refreshUser() {
    const { apiUrl } = this.config;
    try {
      const options = {
        headers: {
          Cookie: this.cookies
        },
        withCredentials: true
      };
      const response = await axios.get(`${apiUrl}customer/current`, options);

      if (response.status === 200) {
        this.user = response.data;
      }
    } catch (error) {
      console.error(`Error in refreshUser: ${error}`);
    }
  }

  async getLists() {
    const { apiUrl } = this.config;
    const options = {
      headers: {
        Cookie: this.cookies
      },
      withCredentials: true
const NodeHelper = require("node_helper");
const request = require("request");
const moment = require("moment");

module.exports = NodeHelper.create({
  start: function () {
    console.log("Starting module helper: " + this.name);
    this.updateTimer = null;
    this.items = [];
  },

  stop: function () {
    console.log("Stopping module helper: " + this.name);
    clearTimeout(this.updateTimer);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.updateItems();
      this.scheduleUpdate();
    }
  },

  scheduleUpdate: function (delay) {
    const nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateItems();
      this.scheduleUpdate();
    }, nextLoad);
  },

  updateItems: function () {
    this.items = [];

    if (!this.config.username || !this.config.password) {
      console.error("MMM-ICA: Missing required config values.");
      return;
    }

    const authOptions = {
      url: this.config.apiUrl + "login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      json: {
        UserName: this.config.username,
        Password: this.config.password,
      },
    };

    request(authOptions, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        console.error("MMM-ICA: Error authenticating with ICA API.");
        console.error(error || response.statusCode);
        this.scheduleUpdate(this.config.retryDelay);
        return;
      }

      const token = body.access_token;

      const reqOptions = {
        url:
          this.config.apiUrl +
          "user/listshoppinglistitems?listTypeId=" +
          this.config.listTypeId,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      request(reqOptions, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          console.error("MMM-ICA: Error retrieving shopping list items.");
          console.error(error || response.statusCode);
          this.scheduleUpdate(this.config.retryDelay);
          return;
        }

        const data = JSON.parse(body);
        if (data && data.Items) {
          data.Items.forEach((item) => {
            if (item.Product) {
              const newItem = {
                id: item.Id,
                name: item.Product.Name,
                category: item.Product.ProductCategory.Name,
                quantity: item.Quantity,
                note: item.Note,
              };
              this.items.push(newItem);
            }
          });
        }

        this.sendSocketNotification("ITEMS", this.items);
        this.scheduleUpdate();
      });
    });
  },
});
