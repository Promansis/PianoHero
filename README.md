# PianoHero Linux Server Deployment

This project can run as a normal web app on your Linux server.

The app will:

- serve the web UI on port `3001`
- store the database and uploaded MIDI files in `/media/storage/pianohero`
- work behind your existing Cloudflare Tunnel

## What This Setup Uses

- Docker
- Docker Compose
- Cloudflare Tunnel

## Files Added

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## Before You Start

Make sure these are installed on your server:

- Docker
- Docker Compose plugin
- Cloudflared

Also make sure port `3001` is free on your server.

## 1. Put the Project on the Server

Example:

```bash
cd /media/storage
git clone <your-repo-url> pianohero-app
cd pianohero-app
```

If you already copied the project there manually, just `cd` into the project folder.

## 2. Create the Data Folder

This is where PianoHero will store its database and uploaded MIDI files.

```bash
mkdir -p /media/storage/pianohero
```

## 3. Build and Start the Container

From inside the project folder:

```bash
docker compose up -d --build
```

To check logs:

```bash
docker compose logs -f pianohero
```

## 4. Test It Locally First

Before adding Cloudflare, make sure it works on your LAN:

```bash
curl http://127.0.0.1:3001
```

Or open:

```text
http://YOUR_SERVER_IP:3001
```

If it is working, you should see the PianoHero web app.

## 5. Add It to Cloudflare Tunnel

Edit your Cloudflare Tunnel config:

```bash
sudo nano /etc/cloudflared/config.yml
```

Add a new ingress rule for PianoHero.

Example:

```yml
tunnel: YOUR_TUNNEL_ID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: piano.a173d20e27.com
    service: http://localhost:3001
  - service: http_status:404
```

If you already have other ingress entries, add the new `piano` hostname above the final `http_status:404` rule.

Then restart Cloudflare:

```bash
sudo systemctl restart cloudflared
```

## 6. Open the Site

After DNS and tunnel routing are active, open:

```text
https://piano.a173d20e27.com
```

## Useful Commands

Start:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

Rebuild after code changes:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f pianohero
```

Check running containers:

```bash
docker ps
```

## Where Data Is Stored

All persistent app data is stored here on the host:

```text
/media/storage/pianohero
```

Inside the container that path is mounted as:

```text
/data
```

That folder contains:

- the SQLite database
- uploaded MIDI files

## Important Notes

- This is the web version of PianoHero, not the full Electron desktop version.
- Browser upload of MIDI files works.
- Some desktop-only actions are not available in web mode, such as native file picker features and some export/save helpers.
- Cloudflare Tunnel gives you HTTPS, which is useful for browser device APIs.

## If You Want to Use a Different Domain

Just change this line in `/etc/cloudflared/config.yml`:

```yml
- hostname: piano.a173d20e27.com
```

For example:

```yml
- hostname: piano.yourdomain.com
```

## If You Want to Use a Different Port

Update both places:

1. In `docker-compose.yml`
2. In `/etc/cloudflared/config.yml`

Current default port:

```text
3001
```

## Troubleshooting

### The app does not start

Check logs:

```bash
docker compose logs -f pianohero
```

### Cloudflare works but the site does not load

Check that:

- the container is running
- port `3001` is listening
- the tunnel points to `http://localhost:3001`
- the new ingress rule is above the catch-all `http_status:404`

### I changed code but nothing updated

Rebuild the container:

```bash
docker compose up -d --build
```

### I want to move the stored data

Change this line in `docker-compose.yml`:

```yml
- /media/storage/pianohero:/data
```

For example:

```yml
- /some/other/path/pianohero:/data
```
