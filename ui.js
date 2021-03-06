$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      console.log(currentUser)
      showNavForLoggedInUser();
    }
  }

  /**
   * Event Handler for Clicking Submit
   */

  $navSubmit.on("click", function() {
    // Show the Submit Story form
    $submitForm.slideToggle();
    $allStoriesList.toggle();
  });

    /**
   * Event listener for submitting new story.
   *  If successfully we will setup a new story instance (???)
   */

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let author = $("#author").val();
    let title = $("#title").val();
    let url = $("#url").val();
    let userToken = currentUser.loginToken;

    // create new Story object from submitted values
    let newStory = {
      'token': `${userToken}`,
      'story': {
        'author': `${author}`,
        'title': `${title}`,
        'url': `${url}`,
      }
    }

    // call the addStory method, which sends a POST request to the API with new story
    await StoryList.addStory(newStory);

    newStorySubmitForm();
  });

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

    /**
   * A rendering function to run to reset the forms after submitting new story
   */

  function newStorySubmitForm() {
    // hide and reset the form for submitting new story
    $submitForm.hide();
    $submitForm.trigger("reset");

    // create new StoryList instance
    generateStories();

    // show the updated stories
    $allStoriesList.show();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small> <i class="far fa-heart"></i>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

   /**
   * Event Handler for Clicking Favorite Button/Heart
   */

  $allStoriesList.on("click", ".fa-heart", async function(evt) {
    // declare variables for target button clicked, story id, and current user
    let $favButton = $(evt.target);
    let storyId = $favButton.parent().attr("id");
    let userToken = currentUser.loginToken;

    // toggle class of favorite button (solid or regular, favorite or unfavorite)
    $favButton.toggleClass("far fas");

    if ($favButton.hasClass("far")) {
      await currentUser.addFavorite(userToken, storyId);
    }
    else if ($favButton.hasClass("fas")) {
      await currentUser.removeFavorite(userToken, storyId);
    }
  });

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    const $name = $("#profile-name");
    const $username = $("#profile-username");
    const $creationDate = $("#profile-account-date");
    const name = localStorage.getItem("name");
    const creationDate = localStorage.getItem("creationDate");

    $name.html(`<b>Name:</b> ${name}`);
    $username.html(`<b>Username:</b> ${currentUser.username}`);
    $creationDate.html(`<b>Account Created:</b> ${creationDate.slice(0, 10)}`);
    
    $navLogin.hide();
    $navLogOut.show();
    $navSubmit.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
      localStorage.setItem("creationDate", currentUser.createdAt);
      localStorage.setItem("name", currentUser.name);
    }
  }
});