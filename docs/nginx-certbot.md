# Nginx & Certbot Operations

This stack runs nginx as a reverse proxy for `aimee.country-connect.co.uk` with automatic certificate renewal handled by Certbot. Certificates are stored in the shared `letsencrypt` and `certbot-var` volumes so they persist between container restarts.

## One-Time Certificate Bootstrap

Before the automatic renewal loop can succeed, provision the initial certificate with Certbot and reload nginx to pick it up:

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d aimee.country-connect.co.uk \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email
docker compose exec nginx nginx -s reload
```

Ensure that the deployment environment provides the `CERTBOT_EMAIL` secret so both the bootstrap command and the renewal service have a valid contact address for Let's Encrypt.
