# Hypha behind NGINX

In practice Hypha runs behind a reverse proxy, usually NGINX. NGINX ends TLS, serves several sites
on one address, and passes the requests to Apache with Hypha over plain HTTP. Treat this as the
normal set-up, not as an exception: several parts of Hypha need to know about the proxy, or they
work on the wrong information.

```
browser --HTTPS--> NGINX (TLS, one or more sites) --HTTP--> Apache + PHP + Hypha
```

## What Hypha needs from the proxy

| Topic | Why it matters | What to set |
|---|---|---|
| Scheme (https) | Hypha builds absolute URLs (`<base href>`, links in mails) from the scheme it sees. Behind NGINX that is `http`, so links point to `http://`. | `SetEnv HTTPS on` in the Apache virtual host. Hypha then marks cookies Secure; PR #477 makes it build `https://` URLs as well. |
| Host | Links in recovery and invitation mails are built from the `Host` header (issue #418). | NGINX: `proxy_set_header Host $host;`. Apache: a fixed `ServerName` and `UseCanonicalName On`. |
| Client address | The login throttle (PR #493), the honeypot (PR #480) and the audit trail (PR #476) work per client address. Without the real address every visitor seems to come from NGINX, so one visitor can lock out everyone and the honeypot would block the proxy. | NGINX: `proxy_set_header X-Real-IP $remote_addr;` and `X-Forwarded-For`. Apache: `mod_remoteip` with `RemoteIPHeader X-Real-IP` and `RemoteIPInternalProxy` set to the address of NGINX only. |
| Upload size | NGINX refuses bodies larger than 1 MB by default (`client_max_body_size 1m`), while Hypha accepts images up to 16 MB (`docs/container/php.ini`). Larger uploads fail with HTTP 413 before they reach Hypha. | `client_max_body_size 20m;` (a little above PHP's `post_max_size`). |
| Timeouts | Sending a mailing happens in the request of the user who presses "send" (KNOWN_ISSUES KI-015); a large list can take minutes. | `proxy_read_timeout 300s;` for the site, or longer for large lists. |
| Security headers | Strict-Transport-Security belongs where TLS ends. | `add_header Strict-Transport-Security "max-age=31536000" always;` at NGINX. The other headers come from Hypha (PR #489) or the container vhost. |
| Caching | NGINX can cache responses. A page shown to a logged-in user must never be stored and served to others. | See [Caching](#caching). |
| Test sites | A test copy should not be indexed by search engines (issue #404). | The `allowIndex` setting of PR #479, or `add_header X-Robots-Tag "noindex, nofollow" always;` at NGINX. |

## Example NGINX site

```nginx
server {
	listen 443 ssl;
	http2 on;
	server_name www.example.org;

	ssl_certificate     /etc/letsencrypt/live/www.example.org/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/www.example.org/privkey.pem;

	add_header Strict-Transport-Security "max-age=31536000" always;

	# Hypha accepts uploads up to 16 MB.
	client_max_body_size 20m;

	location / {
		proxy_pass http://127.0.0.1:8086;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		# Sending a mailing can take minutes.
		proxy_read_timeout 300s;
	}
}

server {
	listen 80;
	server_name www.example.org;
	return 301 https://$host$request_uri;
}
```

## Apache side

In the virtual host of Hypha (the container's `docs/container/hypha-vhost.conf` has these lines
commented out; enable them when NGINX is in front):

```apache
# TLS ends at NGINX: let Hypha build https:// URLs and Secure cookies.
SetEnv HTTPS on

# Take the client address from NGINX, and only from NGINX.
RemoteIPHeader X-Real-IP
RemoteIPInternalProxy 172.17.0.1
```

`mod_remoteip` must be enabled (`a2enmod remoteip`; the container image does this). Set
`RemoteIPInternalProxy` to the address NGINX connects from, and to nothing broader: any client that
can reach Apache directly and is listed there can claim any address. When Apache is only reachable
from NGINX (a container port bound to `127.0.0.1`, or a private network), that risk is small.

## Caching

Hypha renders pages per visitor. A logged-in user sees content for logged-in users only, their name and edit buttons, and **every** page, also for anonymous visitors, contains a per-visitor CSRF token.

Hypha sends no `Cache-Control` for generated HTML (PlanBCode/hypha#470, checked 2026-10-26 with NGINX 1.27 in front of `dev`). Logged-in users are only protected by PHP's default `session.cache_limiter = nocache`, and anonymous pages carry no cache header at all. As a result:

- A cache with `proxy_cache_valid 200 10m` stores an anonymous page together with one visitor's CSRF token. Logging in then fails for everyone until the entry expires, and logged-in users see the anonymous view.
- With `proxy_ignore_headers Cache-Control Expires Set-Cookie`, or with `session.cache_limiter` changed, pages for logged-in users only and private pages were served to anonymous visitors.
- Bypassing the cache on the session cookie alone is not enough: logins still break.

Until #470 is fixed, cache only static paths and never the HTML:

```nginx
location / { proxy_pass http://hypha_backend; }
location ~ ^/(data/themes|system/assets|system/wymeditor|system/bowser|images|files)/ {
    proxy_pass http://hypha_backend;
    proxy_cache hypha;
    proxy_ignore_headers Set-Cookie;
    proxy_hide_header Set-Cookie;
    proxy_cache_valid 200 1h;
}
```

- Never use `proxy_ignore_headers Cache-Control Expires` (or `Vary`/`Set-Cookie`) for Hypha pages.
- Keep PHP's `session.cache_limiter` at `nocache`.
- After the fix, keep `proxy_cache_bypass` and `proxy_no_cache` on `$cookie_hyphaSessionSecure $cookie_hyphaSessionInsecure` as a second line of defence.
- On a CDN, avoid "cache everything" rules for HTML.

Because the HTML cannot be cached, every page view reaches PHP. The capacity that follows from this is in [OPERATIONS.md](OPERATIONS.md) ("Capacity") and in #411.

## Checking the set-up

```bash
# https links and no mixed content
curl -s https://www.example.org/ | grep -o '<base href="[^"]*"'
# the client address reaches Apache (look at the access log of the container)
podman logs hypha 2>&1 | tail -3
# uploads up to 16 MB pass NGINX (no 413)
```
