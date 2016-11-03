var appInfo = { clientId: '000000004C179FFB', scopes: 'onedrive.readonly wl.signin', redirectUri: 'https://localhost:5000/callback.html'}
var tmpResolve = null;

function getToken() {
  //ensureHttps();
  return new Promise(function(resolve, error) {
    var token = getTokenFromCookie();
    if (token) {
      resolve(token);
    } else {
      tmpResolve = resolve;
      challengeForAuth();
    }
  });
}

// for added security we require https
function ensureHttps() {
  if (window.location.protocol != "https:") {
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
  }
}

function getTokenFromCookie() {
  var cookies = document.cookie;
  var name = "onedrive-picker-oauth=";
  var start = cookies.indexOf(name);
  if (start >= 0) {
    start += name.length;
    var end = cookies.indexOf(';', start);
    if (end < 0) {
      end = cookies.length;
    }

    return cookies.substring(start, end);
  }

  return "";
}

function setCookie(token) {
  var expiration = new Date();
  expiration.setTime(expiration.getTime() + 3600 * 1000);
  var cookie = "onedrive-picker-oauth=" + token +"; path=/; expires=" + expiration.toUTCString();
  if (document.location.protocol.toLowerCase() == "https") {
    cookie = cookie + ";secure";
  }

  document.cookie = cookie;
}

function onAuthenticated(token) {
  var resolve = tmpResolve;
  tmpResolve = null;
  setCookie(token);
  resolve(token);
}

function challengeForAuth() {
  var url =
    "https://login.live.com/oauth20_authorize.srf" +
    "?client_id=" + appInfo.clientId +
    "&scope=" + encodeURIComponent(appInfo.scopes) +
    "&response_type=token" +
    "&redirect_uri=" + encodeURIComponent(appInfo.redirectUri);
  popup(url);
}

function popup(url) {
  var width = 525,
      height = 525,
      screenX = window.screenX,
      screenY = window.screenY,
      outerWidth = window.outerWidth,
      outerHeight = window.outerHeight;

  var left = screenX + Math.max(outerWidth - width, 0) / 2;
  var top = screenY + Math.max(outerHeight - height, 0) / 2;

  var features = [
              "width=" + width,
              "height=" + height,
              "top=" + top,
              "left=" + left,
              "status=no",
              "resizable=yes",
              "toolbar=no",
              "menubar=no",
              "scrollbars=yes"];
  var popup = window.open(url, "oauth", features.join(","));
  if (!popup) {
    alert("failed to pop up auth window");
  }

  popup.focus();
}
