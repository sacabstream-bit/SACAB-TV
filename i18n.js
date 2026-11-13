window.I18N = {
  lang: localStorage.getItem("sacab_lang") || "en",
  t: {
    en: {
      home: "Home", search: "Search", categories: "Categories", myList: "My List",
      profile: "Profile", settings: "Settings", login: "Sign In", register: "Sign Up",
      email: "Email", password: "Password", fullName: "Full Name", phone: "Phone",
      confirmPassword: "Confirm Password", forgotPassword: "Forgot Password?",
      noAccount: "Don't have an account?", haveAccount: "Already have an account?",
      logout: "Log Out", watchNow: "Watch Now", moreInfo: "More Info",
      trending: "Trending Now", recentlyAdded: "Recently Added", movies: "Movies",
      popularAnime: "Popular Anime", popularKdrama: "Popular K-Dramas",
      continueWatching: "Continue Watching", topRated: "Top Rated",
      addToList: "Add to My List", removeFromList: "Remove from My List",
      language: "Language", adminDashboard: "Admin Dashboard",
      searchPlaceholder: "Search titles...", noResults: "No results found",
      loading: "Loading...", save: "Save", episodes: "Episodes"
    },
    so: {
      home: "Hoyga", search: "Raadi", categories: "Qaybaha", myList: "Liiskayga",
      profile: "Profile", settings: "Settings", login: "Gal", register: "Isdiiwaangeli",
      email: "Email", password: "Furaha", fullName: "Magaca", phone: "Telefoon",
      confirmPassword: "Xaqiiji furaha", forgotPassword: "Ma illowday furaha?",
      noAccount: "Akoon ma lihid?", haveAccount: "Akoon ma haysataa?",
      logout: "Ka bax", watchNow: "Hadda daawo", moreInfo: "Macluumaad",
      trending: "Kuwa caanka", recentlyAdded: "Dhawaan la daray", movies: "Filimada",
      popularAnime: "Anime", popularKdrama: "K-Drama",
      continueWatching: "Sii daawo", topRated: "Top Rated",
      addToList: "Ku dar Liiska", removeFromList: "Ka saar Liiska",
      language: "Luqadda", adminDashboard: "Admin Dashboard",
      searchPlaceholder: "Raadi...", noResults: "Waxba lama helin",
      loading: "Waa la rarayaa...", save: "Kaydi", episodes: "Qaybaha"
    }
  },
  get: function (key) {
    return (this.t[this.lang] && this.t[this.lang][key]) || this.t.en[key] || key;
  },
  set: function (lang) {
    this.lang = lang;
    localStorage.setItem("sacab_lang", lang);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = window.I18N.get(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.placeholder = window.I18N.get(el.getAttribute("data-i18n-placeholder"));
    });
  }
};
