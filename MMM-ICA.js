Module.register("MMM-ICA", {

  // Default module config.
  defaults: {
    username: "",
    password: "",
    apiUrl: "",
    updateInterval: 60 * 60 * 1000,
    retryDelay: 10 * 60 * 1000,
    showLastPurchases: true,
    showCommonArticles: true,
    showRecipes: true,
    showRandomRecipe: true,
    showRecipeCategories: true,
    showBarcodeScanner: true
  },

  // Define start sequence.
  start: function() {
    this.loaded = false;
    this.lastUpdate = null;
    this.lastPurchases = [];
    this.commonArticles = [];
    this.recipes = [];
    this.randomRecipe = null;
    this.recipeCategories = [];
    this.barcodeResult = null;
    this.scheduleUpdate();
  },

  // Define required styles.
  getStyles: function() {
    return ["MMM-ICA.css"];
  },

  // Define required scripts.
  getScripts: function() {
    return ["moment.js"];
  },

  // Define required translations.
  getTranslations: function() {
    return {
      en: "translations/en.json",
      sv: "translations/sv.json"
    };
  },

  // Define header for module.
  getHeader: function() {
    return this.config.header;
  },

  // Define module content.
  getDom: function() {
    var wrapper = document.createElement("div");
    if (!this.loaded) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    if (this.lastPurchases.length > 0 && this.config.showLastPurchases) {
      wrapper.appendChild(this.createLastPurchasesTable());
    }
    if (this.commonArticles.length > 0 && this.config.showCommonArticles) {
      wrapper.appendChild(this.createCommonArticlesTable());
    }
    if (this.recipes.length > 0 && this.config.showRecipes) {
      wrapper.appendChild(this.createRecipesList());
    }
    if (this.randomRecipe !== null && this.config.showRandomRecipe) {
      wrapper.appendChild(this.createRandomRecipe());
    }
    if (this.recipeCategories.length > 0 && this.config.showRecipeCategories) {
      wrapper.appendChild(this.createRecipeCategoriesList());
    }
    if (this.config.showBarcodeScanner) {
      wrapper.appendChild(this.createBarcodeScanner());
    }
    return wrapper;
  },

  // Create table for last purchases.
  createLastPurchasesTable: function() {
    // TODO: implement function
  },

  // Create table for common articles.
  createCommonArticlesTable: function() {
    // TODO: implement function
  },

  // Create list of recipes.
  createRecipesList: function() {
    // TODO: implement function
  },

  // Create view for a random recipe.
  createRandomRecipe: function() {
    // TODO: implement function
  },

  // Create list of recipe categories.
  createRecipeCategoriesList: function() {
    // TODO: implement function
  },

  // Create view for barcode scanner.
  createBarcodeScanner: function() {
    // TODO: implement function
  },

  // Schedule next update.
  scheduleUpdate: function() {
    var self = this;
    self.updateInterval = setInterval(function() {
      self.updateDom();
    }, self.config.updateInterval);
  },

  // Define update function.
  update: function() {
    var self = this;
    self.getData(function() {
      self.loaded = true;
      self.lastUpdate = moment();
      self.updateDom();
    });
  },

  // Define data retrieval function.
  getStyles: function() {
    return ["MMM-ICA.css"];
  },

  start: function() {
    this.updateData();
    this.scheduleUpdate();
  },

  getHeader: function() {
    return this.config.header;
  },

  getDom: function() {
    var wrapper = document.createElement("div");
    var data = this.data;
    var apiUrl = this.config.apiUrl;

    if (data) {
      var commonArticles = data.commonArticles;
      var userRecipes = data.userRecipes;
      var randomRecipes = data.randomRecipes;
      var categoryRecipes = data.categoryRecipes;

      if (commonArticles) {
        wrapper.appendChild(this.renderCommonArticles(commonArticles));
      }

      if (userRecipes) {
        wrapper.appendChild(this.renderUserRecipes(userRecipes));
      }

      if (randomRecipes) {
        wrapper.appendChild(this.renderRandomRecipes(randomRecipes));
      }

      if (categoryRecipes) {
        wrapper.appendChild(this.renderCategoryRecipes(categoryRecipes));
      }
    } else {
      wrapper.innerHTML = "Loading...";
    }

    return wrapper;
  },

  updateData: function() {
    var self = this;
    var dataRequests = [];

    if (this.config.showCommonArticles) {
      dataRequests.push(this.fetchCommonArticles());
    }

    if (this.config.showUserRecipes) {
      dataRequests.push(this.fetchUserRecipes());
    }

    if (this.config.showRandomRecipes) {
      dataRequests.push(this.fetchRandomRecipes());
    }

    if (this.config.showCategoryRecipes) {
      dataRequests.push(this.fetchCategoryRecipes());
    }

    Promise.all(dataRequests)
      .then(function(responses) {
        var data = {};

        responses.forEach(function(response) {
          if (response.commonArticles) {
            data.commonArticles = response.commonArticles;
          }

          if (response.userRecipes) {
            data.userRecipes = response.userRecipes;
          }

          if (response.randomRecipes) {
            data.randomRecipes = response.randomRecipes;
          }

          if (response.categoryRecipes) {
            data.categoryRecipes = response.categoryRecipes;
          }
        });

        self.data = data;
        self.updateDom();
      })
      .catch(function(error) {
        console.error(error);
      });
  },

  scheduleUpdate: function(delay) {
    var self = this;
    var nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    setInterval(function() {
      self.updateData();
    }, nextLoad);
  },

  fetchCommonArticles: function() {
    var self = this;
    var url = this.config.apiUrl + "user/commonarticles/";

    return this.fetchData(url)
      .then(function(response) {
        return { commonArticles: response.CommonArticles };
      })
      .catch(function(error) {
        console.error("Error fetching common articles:", error);
        return {};
      });
  },

  fetchUserRecipes: function() {
    var self = this;
    var url = this.config.apiUrl + "user/recipes";

    return this.fetchData(url)
      .then(function(response) {
        return { userRecipes: response };
      })
      .catch(function(error) {
        console.error("Error fetching user recipes:", error);
        return {};
      });
  },

  fetchRandomRecipes: function() {
    var self = this;
    var url = this.config.apiUrl + "recipes/random?numberofrecipes=1";

    return this.fetchData(url)
      .then(function(response) {
        return { randomRecipes: response };
      })
      .catch(function(error) {
        console.error("Error fetching random recipes:", error);
        return {};
      });
        // Create and append the module wrapper element to the DOM.
        const moduleWrapper = document.createElement("div");
        moduleWrapper.classList.add("mmm-ica");
        moduleWrapper.innerHTML = `<div class="mmm-ica-header">${this.config.header}</div>
                                    <div class="mmm-ica-content"></div>`;
        wrapper.appendChild(moduleWrapper);

        // Store references to the header and content elements.
        this.headerElement = moduleWrapper.querySelector(".mmm-ica-header");
        this.contentElement = moduleWrapper.querySelector(".mmm-ica-content");

        // Fetch data from the API and update the module content.
        this.fetchDataAndUpdateContent();

        // Schedule regular data fetching and content updating.
        setInterval(() => {
            this.fetchDataAndUpdateContent();
        }, this.config.updateInterval);

        // Set up error handling and automatic retrying.
        this.errorRetriesRemaining = 3;
        this.errorRetryTimeout = null;
    }

    /**
     * Fetches data from the API and updates the module content.
     */
    async fetchDataAndUpdateContent() {
        try {
            // Fetch data from the API.
            const data = await this.fetchDataFromApi();

            // Update the module content with the fetched data.
            this.updateContent(data);
        } catch (error) {
            // Handle errors and retry automatically.
            console.error("An error occurred while fetching data from the API:", error);

            if (this.errorRetriesRemaining > 0) {
                console.log(`Retrying in ${this.config.retryDelay / 1000} seconds...`);
                this.errorRetriesRemaining--;

                if (this.errorRetryTimeout !== null) {
                    clearTimeout(this.errorRetryTimeout);
                }

                this.errorRetryTimeout = setTimeout(() => {
                    this.fetchDataAndUpdateContent();
                }, this.config.retryDelay);
            } else {
                console.error(`Failed to fetch data from the API after ${this.errorRetriesRemaining + 1} retries.`);
            }
        }
    }

    /**
     * Fetches data from the API.
     *
     * @returns {Promise} A promise that resolves with the fetched data.
     */
    fetchDataFromApi() {
        // Create an authentication ticket for the API.
        const authenticationTicket = this.createAuthenticationTicket(this.config.username, this.config.password);

        // Build the API endpoint URL.
        const endpointUrl = `${this.config.apiUrl}user/inventory/`;

        // Fetch data from the API using the authentication ticket.
        return fetch(endpointUrl, {
            headers: {
                "AuthenticationTicket": authenticationTicket
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch data from the API (${response.status} ${response.statusText}).`);
                }

                return response.json();
            });
    }

    /**
     * Updates the module content with the provided data.
     *
     * @param {Object} data The data to update the module content with.
     */
    updateContent(data) {
        // Clear the current module content.
        this.contentElement.innerHTML = "";

        // Render each enabled module component.
        if (this.config.showInventory) {
            this.renderInventory(data);
        }

        if (this.config.showShoppingLists) {
            this.renderShoppingLists(data);
        }

        if (this.config.showCommonArticles) {
            this.renderCommonArticles(data);
        }

        if (this.config.showRecipes) {
            this.renderRecipes(data);
        }
    }

    /**
     * Renders the user's inventory.
     *
     * @param {Object} data The data containing the user's inventory.
     */
    renderInventory(data) {
        const inventory = data.Inventory;

        //
		// Fetches the current user's recipes.
		fetchUserRecipes() {
			const self = this;
			const url = `${this.config.apiUrl}user/recipes`;
			const headers = this.getRequestHeaders();
			fetch(url, { headers })
				.then(response => response.json())
				.then(json => {
					if (json.RecipeIds) {
						self.userRecipeIds = json.RecipeIds;
						self.updateDom();
					}
				})
				.catch(error => {
					console.error(`Error fetching user recipes: ${error}`);
				});
		},

		// Fetches the user's common articles.
		fetchCommonArticles() {
			const self = this;
			const url = `${this.config.apiUrl}user/commonarticles/`;
			const headers = this.getRequestHeaders();
			fetch(url, { headers })
				.then(response => response.json())
				.then(json => {
					if (json.CommonArticles) {
						self.commonArticles = json.CommonArticles;
						self.updateDom();
					}
				})
				.catch(error => {
					console.error(`Error fetching common articles: ${error}`);
				});
		},

		// Gets the request headers including the authentication ticket.
		getRequestHeaders() {
			const headers = new Headers();
			headers.append("Content-Type", "application/json");
			if (this.config.authenticationTicket) {
				headers.append("AuthenticationTicket", this.config.authenticationTicket);
			}
			return headers;
		},

		// Renders the module's content.
		getDom() {
			const wrapper = document.createElement("div");

			if (this.loading) {
				wrapper.innerHTML = this.translate("LOADING");
				wrapper.className = "dimmed light small";
				return wrapper;
			}

			if (this.error) {
				wrapper.innerHTML = this.translate("ERROR") + ` ${this.error}`;
				wrapper.className = "dimmed light small";
				return wrapper;
			}

			if (!this.loggedIn) {
				wrapper.innerHTML = this.translate("NOT_LOGGED_IN");
				wrapper.className = "dimmed light small";
				return wrapper;
			}

			// Create a table with all the enabled sections.
			const table = document.createElement("table");
			table.className = "small";

			if (this.config.showLists) {
				const shoppingListRow = this.createShoppingListRow();
				if (shoppingListRow) {
					table.appendChild(shoppingListRow);
				}

				const recipeListRow = this.createRecipeListRow();
				if (recipeListRow) {
					table.appendChild(recipeListRow);
				}

				const commonArticlesRow = this.createCommonArticlesRow();
				if (commonArticlesRow) {
					table.appendChild(commonArticlesRow);
				}
			}

			if (this.config.showCategories) {
				const categoriesRow = this.createCategoriesRow();
				if (categoriesRow) {
					table.appendChild(categoriesRow);
				}
			}

			wrapper.appendChild(table);

			return wrapper;
		},

		// Creates a row for the shopping list.
		createShoppingListRow() {
			if (!this.config.showShoppingList) {
				return null;
			}

			const shoppingList = this.shoppingList;
			if (!shoppingList || !shoppingList.Items) {
				return null;
			}

			const row = document.createElement("tr");

			const iconCell = document.createElement("td");
			iconCell.className = "align-right";
			iconCell.innerHTML = `<i class="fas fa-shopping-cart"></i>`;
			row.appendChild(iconCell);

			const nameCell = document.createElement("td");
class MMMICA extends Module {
  constructor(config) {
    super(config);

    this.config = config;

    this.loaded = false;
    this.error = false;

    this.items = [];
  }

  async start() {
    await this.updateData();
    this.scheduleUpdate();
  }

  scheduleUpdate() {
    const { updateInterval } = this.config;
    setInterval(() => {
      this.updateData();
    }, updateInterval);
  }

  async updateData() {
    try {
      const { apiUrl, username, password } = this.config;
      const authToken = await this.authenticate(apiUrl, username, password);

      if (!authToken) {
        this.error = true;
        this.loaded = true;
        return;
      }

      const itemIds = await this.getCommonArticles(authToken);
      const items = await this.getItems(itemIds, authToken);

      this.items = items;
      this.error = false;
      this.loaded = true;
    } catch (error) {
      console.error(error);
      this.error = true;
      this.loaded = true;
    }

    this.updateDom();
  }

  async authenticate(apiUrl, username, password) {
    const response = await fetch(`${apiUrl}authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      console.error(`Failed to authenticate: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.token;
  }

  async getCommonArticles(authToken) {
    const response = await fetch(`${this.config.apiUrl}user/commonarticles`, {
      headers: {
        AuthenticationTicket: authToken,
      },
    });

    if (!response.ok) {
      console.error(`Failed to get common articles: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.CommonArticles.map((item) => item.ArticleId);
  }

  async getItems(itemIds, authToken) {
    const items = [];

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const itemData = await this.getItem(itemId, authToken);
      items.push(itemData);
    }

    return items;
  }

  async getItem(itemId, authToken) {
    const response = await fetch(
      `${this.config.apiUrl}upclookup?upc=${itemId}`,
      {
        headers: {
          AuthenticationTicket: authToken,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to get item ${itemId}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const item = data.Items[0];
    return {
      name: item.ItemDescription,
      image: item.ProductGroup.Suggestion,
    };
  }

  getDom() {
    const wrapper = document.createElement("div");

    if (this.error) {
      wrapper.innerHTML = "Error";
      wrapper.classList.add("error");
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = "Loading...";
      wrapper.classList.add("dimmed");
      return wrapper;
    }

    const header = document.createElement("header");
    header.innerHTML = this.config.header;
    wrapper.appendChild(header);

    const list = document.createElement("ul");
    wrapper.appendChild(list);

    this.items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = item.name;
      list.appendChild(listItem);

      const image = document.createElement("img");
      image.src = `https://via.placeholder.com/50x

