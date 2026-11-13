/* SACAB TV Firebase */
window.SACAB_CONFIG = {
  apiKey: "AIzaSyBcXbEjWrNih6_eLK9J3VqmWj--n0Xc5ko",
  authDomain: "sacab4.firebaseapp.com",
  databaseURL: "https://sacab4-default-rtdb.firebaseio.com",
  projectId: "sacab4",
  storageBucket: "sacab4.firebasestorage.app",
  messagingSenderId: "460527133065",
  appId: "1:460527133065:web:2392cef4f637eaf8040158",
  measurementId: "G-VW6S5M5L6C"
};
window.SUPER_ADMIN_EMAIL = "abdimalikbaashi@gmail.com";

window.initSacabFirebase = function () {
  if (typeof firebase === "undefined") {
    return false;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.SACAB_CONFIG);
    }
    window.auth = firebase.auth();
    window.db = firebase.database();
    window.storage = firebase.storage();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
