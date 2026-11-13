(function () {
  "use strict";

  var user = null;
  var profile = null;
  var isAdmin = false;
  var content = [];
  var currentItem = null;

  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.classList.remove("hidden"); }
  function hide(el) { if (el) el.classList.add("hidden"); }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2500);
  }
  function err(id, msg) {
    var e = $(id);
    if (!e) return;
    e.textContent = msg;
    e.style.display = "block";
  }
  function clearErr(id) {
    var e = $(id);
    if (e) e.style.display = "none";
  }

  function showView(name) {
    ["login", "register", "forgot", "app"].forEach(function (v) {
      hide($("view-" + v));
    });
    show($("view-" + name));
  }

  function showPage(name) {
    document.querySelectorAll(".page").forEach(function (p) {
      p.classList.remove("active");
    });
    var page = $("page-" + name);
    if (page) page.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-page") === name);
    });
    var nav = $("bottomNav");
    if (nav) {
      nav.style.display = (name === "detail" || name === "admin" || name === "settings") ? "none" : "flex";
    }
    if (name === "home") loadHome();
    if (name === "mylist") loadMyList();
    if (name === "admin") loadAdmin();
  }

  // Boot
  if (!window.initSacabFirebase || !window.initSacabFirebase()) {
    hide($("view-login"));
    show($("bootError"));
    return;
  }

  var auth = window.auth;
  var db = window.db;

  // Auth state – ONE login for everyone
  auth.onAuthStateChanged(function (u) {
    user = u;
    if (!u) {
      showView("login");
      isAdmin = false;
      return;
    }
    loadProfile(u.uid).then(function () {
      showView("app");
      showPage("home");
      checkAdmin(u);
      loadAds();
      window.I18N.set(window.I18N.lang);
    });
  });

  function loadProfile(uid) {
    return db.ref("users/" + uid).once("value").then(function (snap) {
      profile = snap.val() || {};
      if (profile.language) window.I18N.set(profile.language);
      $("pName").textContent = profile.name || user.displayName || "User";
      $("pEmail").textContent = user.email || "";
      if (profile.photoURL) $("pAvatar").src = profile.photoURL;
      if ($("langSelect")) $("langSelect").value = window.I18N.lang;
    }).catch(function () {
      profile = {};
    });
  }

  function checkAdmin(u) {
    isAdmin = false;
    var email = (u.email || "").toLowerCase();
    var superEmail = (window.SUPER_ADMIN_EMAIL || "").toLowerCase();

    return db.ref("admins/" + u.uid).once("value").then(function (snap) {
      var role = snap.val();
      if (role === "super" || role === "editor") isAdmin = true;
      if (email === superEmail) {
        isAdmin = true;
        if (!role) {
          db.ref("admins/" + u.uid).set("super");
          db.ref("users/" + u.uid + "/role").set("super");
        }
      }
      var btn = $("btnAdmin");
      if (btn) {
        if (isAdmin) btn.classList.remove("hidden");
        else btn.classList.add("hidden");
      }
    }).catch(function () {
      if (email === superEmail) {
        isAdmin = true;
        var btn = $("btnAdmin");
        if (btn) btn.classList.remove("hidden");
      }
    });
  }

  // Login
  $("formLogin").addEventListener("submit", function (e) {
    e.preventDefault();
    clearErr("loginErr");
    var email = $("loginEmail").value.trim();
    var pass = $("loginPassword").value;
    auth.signInWithEmailAndPassword(email, pass).catch(function (ex) {
      var msg = "Login failed";
      if (ex.code === "auth/user-not-found") msg = "Account not found – please Sign Up";
      else if (ex.code === "auth/wrong-password" || ex.code === "auth/invalid-credential") msg = "Wrong email or password";
      else if (ex.code === "auth/invalid-email") msg = "Invalid email";
      else if (ex.code === "auth/operation-not-allowed") msg = "Enable Email/Password in Firebase Console";
      else if (ex.code === "auth/network-request-failed") msg = "Network error – check internet / VPN";
      else if (ex.message) msg = ex.message;
      err("loginErr", msg);
    });
  });

  // Register
  $("formRegister").addEventListener("submit", function (e) {
    e.preventDefault();
    clearErr("regErr");
    var name = $("regName").value.trim();
    var email = $("regEmail").value.trim();
    var phone = $("regPhone").value.trim();
    var pass = $("regPass").value;
    var pass2 = $("regPass2").value;
    var lang = $("regLang").value;
    if (pass !== pass2) { err("regErr", "Passwords do not match"); return; }
    if (pass.length < 6) { err("regErr", "Password min 6 characters"); return; }

    auth.createUserWithEmailAndPassword(email, pass).then(function (cred) {
      return cred.user.updateProfile({ displayName: name }).then(function () {
        var data = {
          name: name,
          email: email,
          phone: phone || "",
          language: lang,
          role: "user",
          createdAt: Date.now()
        };
        var p = db.ref("users/" + cred.user.uid).set(data);
        if (email.toLowerCase() === (window.SUPER_ADMIN_EMAIL || "").toLowerCase()) {
          p = p.then(function () {
            return db.ref("admins/" + cred.user.uid).set("super");
          });
        }
        window.I18N.set(lang);
        return p;
      });
    }).catch(function (ex) {
      var msg = "Registration failed";
      if (ex.code === "auth/email-already-in-use") msg = "Email already registered";
      else if (ex.code === "auth/weak-password") msg = "Password too weak";
      else if (ex.code === "auth/invalid-email") msg = "Invalid email";
      else if (ex.code === "auth/operation-not-allowed") msg = "Enable Email/Password in Firebase Console";
      else if (ex.code === "auth/network-request-failed") msg = "Network error – check internet / VPN";
      else if (ex.message) msg = ex.message;
      err("regErr", msg);
    });
  });

  // Forgot
  $("formForgot").addEventListener("submit", function (e) {
    e.preventDefault();
    clearErr("forgotErr");
    $("forgotOk").style.display = "none";
    auth.sendPasswordResetEmail($("forgotEmail").value.trim()).then(function () {
      $("forgotOk").style.display = "block";
    }).catch(function (ex) {
      err("forgotErr", ex.message || "Failed");
    });
  });

  // Auth links
  $("linkRegister").onclick = function (e) { e.preventDefault(); showView("register"); };
  $("linkLogin").onclick = function (e) { e.preventDefault(); showView("login"); };
  $("linkForgot").onclick = function (e) { e.preventDefault(); showView("forgot"); };
  $("linkBackLogin").onclick = function (e) { e.preventDefault(); showView("login"); };

  // Nav
  document.querySelectorAll(".nav-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      showPage(b.getAttribute("data-page"));
    });
  });
  $("btnGoSearch").onclick = function () { showPage("search"); };
  $("btnGoProfile").onclick = function () { showPage("profile"); };
  $("btnSettings").onclick = function () { showPage("settings"); };
  $("settingsBack").onclick = function () { showPage("profile"); };
  $("btnLogout").onclick = function () { auth.signOut(); };
  $("btnAdmin").onclick = function () {
    if (isAdmin) showPage("admin");
    else toast("Access denied");
  };
  $("adminBack").onclick = function () { showPage("profile"); };
  $("detailBack").onclick = function () { showPage("home"); };

  $("langSelect").onchange = function () {
    window.I18N.set(this.value);
    if (user) db.ref("users/" + user.uid + "/language").set(this.value);
  };

  // Content
  function loadContent() {
    return db.ref("content").once("value").then(function (snap) {
      var data = snap.val() || {};
      content = Object.keys(data).map(function (id) {
        var item = data[id];
        item.id = id;
        return item;
      });
      content.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      return content;
    }).catch(function () {
      content = [];
      return content;
    });
  }

  function cardHtml(item) {
    var img = item.poster || item.banner || "assets/logo.png";
    return '<div class="card" data-id="' + item.id + '">' +
      '<img src="' + img + '" alt="" onerror="this.src=\'assets/logo.png\'">' +
      '<div class="t">' + esc(item.title || "") + '</div>' +
      '<div class="m">' + esc((item.year || "") + (item.type ? " · " + item.type : "")) + '</div></div>';
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function bindCards(root) {
    root.querySelectorAll(".card").forEach(function (c) {
      c.onclick = function () {
        var item = content.find(function (x) { return x.id === c.getAttribute("data-id"); });
        if (item) openDetail(item);
      };
    });
  }

  function loadHome() {
    var rows = $("homeRows");
    rows.innerHTML = '<div class="spinner"></div>';
    loadContent().then(function () {
      var feat = content.find(function (c) { return c.featured; }) || content[0];
      if (feat) {
        currentItem = feat;
        $("heroBg").style.backgroundImage = feat.banner || feat.poster ? "url(" + (feat.banner || feat.poster) + ")" : "";
        $("heroTitle").textContent = feat.title || "SACAB TV";
        $("heroDesc").textContent = feat.description || "";
        $("heroPlay").onclick = function () { playItem(feat); };
        $("heroInfo").onclick = function () { openDetail(feat); };
      }
      var sections = [
        { title: window.I18N.get("trending"), filter: function (c) { return c.trending; } },
        { title: window.I18N.get("recentlyAdded"), filter: function () { return true; } },
        { title: window.I18N.get("popularAnime"), filter: function (c) { return c.type === "anime"; } },
        { title: window.I18N.get("popularKdrama"), filter: function (c) { return c.type === "kdrama"; } },
        { title: window.I18N.get("movies"), filter: function (c) { return c.type === "movie"; } }
      ];
      var html = "";
      sections.forEach(function (sec) {
        var items = content.filter(sec.filter);
        if (sec.title === window.I18N.get("recentlyAdded")) items = items.slice(0, 20);
        if (!items.length) return;
        html += '<div class="section"><h3>' + sec.title + '</h3><div class="row">' +
          items.map(cardHtml).join("") + "</div></div>";
      });
      rows.innerHTML = html || '<div class="empty">No content yet. Admin can add titles.</div>';
      bindCards(rows);
    });
  }

  function openDetail(item) {
    currentItem = item;
    showPage("detail");
    $("detailBanner").style.backgroundImage = "url(" + (item.banner || item.poster || "assets/logo.png") + ")";
    $("detailTitle").textContent = item.title || "";
    $("detailMeta").textContent = [item.year, item.type, item.genre].filter(Boolean).join(" · ");
    $("detailDesc").textContent = item.description || "";
    $("detailPlay").onclick = function () { playItem(item); };
    updateFavBtn(item.id);
    $("detailFav").onclick = function () { toggleFav(item.id); };

    var eps = $("detailEps");
    if (item.episodes && item.episodes.length) {
      eps.innerHTML = "<h3 style='margin:12px 0 8px'>" + window.I18N.get("episodes") + "</h3>" +
        item.episodes.map(function (ep, i) {
          return '<div class="ep" data-i="' + i + '">' +
            '<img src="' + (ep.thumbnail || item.poster || "assets/logo.png") + '" onerror="this.src=\'assets/logo.png\'">' +
            '<div><h4>' + esc(ep.title || ("Episode " + (i + 1))) + "</h4>" +
            "<p>" + esc(ep.description || "") + "</p></div></div>";
        }).join("");
      eps.querySelectorAll(".ep").forEach(function (el) {
        el.onclick = function () {
          var ep = item.episodes[+el.getAttribute("data-i")];
          playItem({
            id: item.id,
            title: item.title + " – " + (ep.title || ""),
            videoUrl: ep.videoUrl || item.videoUrl
          });
        };
      });
    } else {
      eps.innerHTML = "";
    }
  }

  function playItem(item) {
    var url = item.videoUrl || item.video || "";
    if (!url) { toast("No video URL"); return; }
    $("playerTitle").textContent = item.title || "";
    $("videoEl").src = url;
    $("player").classList.add("open");
    $("videoEl").play().catch(function () {});
    if (user && item.id) {
      db.ref("watchHistory/" + user.uid + "/" + item.id).once("value").then(function (s) {
        var d = s.val();
        if (d && d.position) $("videoEl").currentTime = d.position;
      });
    }
  }

  $("playerClose").onclick = function () {
    var v = $("videoEl");
    if (user && currentItem && currentItem.id && v.currentTime > 5) {
      db.ref("watchHistory/" + user.uid + "/" + currentItem.id).update({
        position: v.currentTime,
        duration: v.duration || 0,
        updatedAt: Date.now(),
        title: currentItem.title
      });
    }
    v.pause();
    v.removeAttribute("src");
    v.load();
    $("player").classList.remove("open");
  };

  function updateFavBtn(id) {
    if (!user) return;
    db.ref("favorites/" + user.uid + "/" + id).once("value").then(function (s) {
      $("detailFav").textContent = s.exists() ? window.I18N.get("removeFromList") : window.I18N.get("addToList");
    });
  }

  function toggleFav(id) {
    if (!user) return;
    var ref = db.ref("favorites/" + user.uid + "/" + id);
    ref.once("value").then(function (s) {
      if (s.exists()) {
        ref.remove();
        toast(window.I18N.get("removeFromList"));
      } else {
        ref.set({ addedAt: Date.now() });
        toast(window.I18N.get("addToList"));
      }
      updateFavBtn(id);
    });
  }

  function loadMyList() {
    var grid = $("listGrid");
    if (!user) { grid.innerHTML = '<div class="empty">Login required</div>'; return; }
    grid.innerHTML = '<div class="spinner"></div>';
    Promise.all([loadContent(), db.ref("favorites/" + user.uid).once("value")]).then(function (res) {
      var favs = res[1].val() || {};
      var items = content.filter(function (c) { return favs[c.id]; });
      grid.innerHTML = items.length ? items.map(cardHtml).join("") : '<div class="empty">' + window.I18N.get("noResults") + "</div>";
      bindCards(grid);
    });
  }

  // Search
  var searchTimer;
  $("searchInput").oninput = function () {
    var q = this.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var grid = $("searchGrid");
      if (!q) { grid.innerHTML = ""; return; }
      loadContent().then(function () {
        var r = content.filter(function (c) {
          return (c.title || "").toLowerCase().indexOf(q) >= 0 ||
            (c.genre || "").toLowerCase().indexOf(q) >= 0 ||
            (c.type || "").toLowerCase().indexOf(q) >= 0;
        });
        grid.innerHTML = r.length ? r.map(cardHtml).join("") : '<div class="empty">' + window.I18N.get("noResults") + "</div>";
        bindCards(grid);
      });
    }, 250);
  };

  // Categories
  document.querySelectorAll(".cat-btn").forEach(function (b) {
    b.onclick = function () {
      var type = b.getAttribute("data-type");
      loadContent().then(function () {
        var items = content.filter(function (c) { return c.type === type; });
        var grid = $("catGrid");
        grid.innerHTML = items.length ? items.map(cardHtml).join("") : '<div class="empty">' + window.I18N.get("noResults") + "</div>";
        bindCards(grid);
      });
    };
  });

  // ========== ADMIN (same session) ==========
  function loadAdmin() {
    if (!isAdmin) { toast("Access denied"); showPage("profile"); return; }
    loadContent().then(function () {
      $("stContent").textContent = content.length;
      renderAdminContent();
    });
    db.ref("users").once("value").then(function (s) {
      var u = s.val() || {};
      $("stUsers").textContent = Object.keys(u).length;
      var list = $("adminUsersList");
      list.innerHTML = Object.keys(u).map(function (uid) {
        var x = u[uid];
        return '<div class="list-row"><div class="info"><h4>' + esc(x.name || "User") +
          "</h4><p>" + esc(x.email || "") + " · " + (x.role || "user") + "</p></div></div>";
      }).join("") || '<div class="empty">No users</div>';
    }).catch(function () {
      $("adminUsersList").innerHTML = '<div class="empty">Cannot load users</div>';
    });
    loadAdsForm();
  }

  function renderAdminContent() {
    var list = $("adminContentList");
    list.innerHTML = content.map(function (item) {
      return '<div class="list-row">' +
        '<img src="' + (item.poster || "assets/logo.png") + '" onerror="this.src=\'assets/logo.png\'">' +
        '<div class="info"><h4>' + esc(item.title) + "</h4><p>" + esc(item.type || "") +
        (item.featured ? " · Featured" : "") + "</p></div>" +
        '<div class="acts"><button class="sm edit" data-id="' + item.id + '">Edit</button>' +
        '<button class="sm del" data-id="' + item.id + '">Del</button></div></div>';
    }).join("") || '<div class="empty">No content</div>';

    list.querySelectorAll(".edit").forEach(function (b) {
      b.onclick = function () {
        var item = content.find(function (c) { return c.id === b.getAttribute("data-id"); });
        openContentForm(item);
      };
    });
    list.querySelectorAll(".del").forEach(function (b) {
      b.onclick = function () {
        if (!confirm("Delete?")) return;
        db.ref("content/" + b.getAttribute("data-id")).remove().then(function () {
          loadAdmin();
          toast("Deleted");
        });
      };
    });
  }

  document.querySelectorAll(".admin-tabs button").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll(".admin-tabs button").forEach(function (x) { x.classList.remove("on"); });
      document.querySelectorAll(".admin-panel").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      $("tab-" + b.getAttribute("data-tab")).classList.add("on");
    };
  });

  $("btnAddContent").onclick = function () { openContentForm(null); };
  $("modalClose").onclick = function () { $("contentModal").classList.remove("open"); };

  function openContentForm(item) {
    $("modalTitle").textContent = item ? "Edit Content" : "Add Content";
    $("cId").value = item ? item.id : "";
    $("cTitle").value = item ? item.title || "" : "";
    $("cType").value = item ? item.type || "movie" : "movie";
    $("cDesc").value = item ? item.description || "" : "";
    $("cYear").value = item ? item.year || "" : "";
    $("cGenre").value = item ? item.genre || "" : "";
    $("cPoster").value = item ? item.poster || "" : "";
    $("cBanner").value = item ? item.banner || "" : "";
    $("cVideo").value = item ? item.videoUrl || "" : "";
    $("cFeat").checked = !!(item && item.featured);
    $("cTrend").checked = !!(item && item.trending);
    $("cEps").value = item && item.episodes ? JSON.stringify(item.episodes) : "";
    $("contentModal").classList.add("open");
  }

  $("formContent").onsubmit = function (e) {
    e.preventDefault();
    if (!isAdmin) return;
    var id = $("cId").value || db.ref("content").push().key;
    var episodes = [];
    try {
      var raw = $("cEps").value.trim();
      if (raw) episodes = JSON.parse(raw);
    } catch (ex) {
      toast("Invalid episodes JSON");
      return;
    }
    var payload = {
      title: $("cTitle").value.trim(),
      type: $("cType").value,
      description: $("cDesc").value.trim(),
      year: parseInt($("cYear").value, 10) || null,
      genre: $("cGenre").value.trim(),
      poster: $("cPoster").value.trim(),
      banner: $("cBanner").value.trim(),
      videoUrl: $("cVideo").value.trim(),
      featured: $("cFeat").checked,
      trending: $("cTrend").checked,
      episodes: episodes,
      updatedAt: Date.now()
    };
    var ref = db.ref("content/" + id);
    var op = $("cId").value ? ref.update(payload) : ref.set(Object.assign({ createdAt: Date.now() }, payload));
    op.then(function () {
      $("contentModal").classList.remove("open");
      toast("Saved");
      loadAdmin();
    }).catch(function (ex) {
      toast(ex.message || "Save failed");
    });
  };

  // Ads
  function loadAdsForm() {
    db.ref("ads").once("value").then(function (s) {
      var a = s.val() || {};
      var n = a._network || {};
      $("adNet").value = n.provider || "none";
      $("adPub").value = n.publisherId || "";
      setAdFields("Top", a.home_top);
      setAdFields("Mid", a.home_mid);
      setAdFields("Det", a.detail);
    });
  }

  function setAdFields(key, ad) {
    ad = ad || {};
    $("ad" + key + "On").checked = !!ad.enabled;
    $("ad" + key + "Img").value = ad.imageUrl || "";
    $("ad" + key + "Link").value = ad.linkUrl || "";
    $("ad" + key + "Html").value = ad.htmlCode || "";
  }

  $("btnSaveAds").onclick = function () {
    if (!isAdmin) return;
    var updates = {
      _network: {
        provider: $("adNet").value,
        publisherId: $("adPub").value.trim(),
        updatedAt: Date.now()
      },
      home_top: {
        enabled: $("adTopOn").checked,
        imageUrl: $("adTopImg").value.trim(),
        linkUrl: $("adTopLink").value.trim(),
        htmlCode: $("adTopHtml").value.trim()
      },
      home_mid: {
        enabled: $("adMidOn").checked,
        imageUrl: $("adMidImg").value.trim(),
        linkUrl: $("adMidLink").value.trim(),
        htmlCode: $("adMidHtml").value.trim()
      },
      detail: {
        enabled: $("adDetOn").checked,
        imageUrl: $("adDetImg").value.trim(),
        linkUrl: $("adDetLink").value.trim(),
        htmlCode: $("adDetHtml").value.trim()
      }
    };
    db.ref("ads").update(updates).then(function () {
      toast("Ads saved");
      loadAds();
    }).catch(function (ex) {
      toast(ex.message || "Failed");
    });
  };

  function loadAds() {
    db.ref("ads").once("value").then(function (s) {
      var a = s.val() || {};
      renderAd("adHomeTop", a.home_top);
      renderAd("adHomeMid", a.home_mid);
      renderAd("adDetail", a.detail);
    }).catch(function () {});
  }

  function renderAd(elId, ad) {
    var el = $(elId);
    if (!el) return;
    if (!ad || !ad.enabled) { el.classList.remove("show"); el.innerHTML = ""; return; }
    if (ad.htmlCode) {
      el.innerHTML = ad.htmlCode;
      el.classList.add("show");
    } else if (ad.imageUrl) {
      el.innerHTML = '<a href="' + (ad.linkUrl || "#") + '" target="_blank" rel="noopener"><img src="' + ad.imageUrl + '" alt="Ad"></a>';
      el.classList.add("show");
    } else {
      el.classList.remove("show");
    }
  }

  window.I18N.set(window.I18N.lang);
})();
