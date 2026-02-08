# Deployment Guide

## Pre-Deployment Checklist

- [ ] Got Gemini API key from https://aistudio.google.com/app/apikey
- [ ] Tested locally with `npm run dev`
- [ ] Tested production build with `npm run build && npm run preview`
- [ ] Verified no console errors
- [ ] Checked mobile responsiveness
- [ ] Verified fluid effects work smoothly

## Platform-Specific Instructions

### 1. Vercel (Easiest)

```bash
# install cli
npm i -g vercel

# login
vercel login

# deploy
vercel --prod

# add api key as environment variable
vercel env add VITE_GEMINI_API_KEY
# paste your key when prompted

# redeploy to use env var
vercel --prod
```

**Or use dashboard:**
1. Import git repo to Vercel
2. Go to Settings → Environment Variables
3. Add `VITE_GEMINI_API_KEY`
4. Redeploy

### 2. Netlify

```bash
# install cli
npm i -g netlify-cli

# login
netlify login

# build locally
npm run build

# deploy
netlify deploy --prod --dir=dist
```

**Add environment variable:**
1. Go to Site settings → Build & deploy → Environment
2. Add `VITE_GEMINI_API_KEY` = your_key
3. Trigger redeploy

### 3. Docker (Self-Hosted)

```bash
# simple way with docker-compose
docker-compose up -d

# or manual
docker build -t buildbetter .
docker run -d -p 80:80 --name buildbetter buildbetter

# check logs
docker logs -f buildbetter

# check health
curl http://localhost/health
```

**With environment variable:**
```bash
docker run -d -p 80:80 \
  -e VITE_GEMINI_API_KEY=your_key \
  buildbetter
```

### 4. AWS (S3 + CloudFront)

```bash
# build
npm run build

# upload to s3
aws s3 sync dist/ s3://your-bucket --delete

# invalidate cloudfront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

**Note:** Can't use env vars with static S3. Users will need to enter their own API keys.

## Environment Variables

### Required

- `VITE_GEMINI_API_KEY` - Your Gemini API key

### Optional

- `NODE_ENV` - Set to `production` for prod builds

## Post-Deployment

### Verify Everything Works

1. Visit your deployed URL
2. Enter a test pitch
3. Click "analyze startup"
4. Verify analysis appears
5. Check browser console for errors
6. Test on mobile
7. Verify fluid effects render smoothly

### Monitor

- Check `/health` endpoint returns 200
- Monitor error logs
- Watch API usage in Google AI Studio
- Check performance metrics

## SSL/HTTPS

Most platforms (Vercel, Netlify) provide free SSL automatically.

For self-hosted:
```bash
# using certbot
certbot --nginx -d yourdomain.com
```

## Custom Domain

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS:
   - Type: A → 76.76.21.21
   - Type: CNAME → cname.vercel-dns.com

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Update DNS to Netlify nameservers or add A record

## Scaling

Free tiers are fine for MVP:
- Vercel: 100GB bandwidth/month
- Netlify: 100GB bandwidth/month
- Gemini: 1,500 requests/day

For higher traffic:
- Upgrade to paid hosting plan
- Upgrade Gemini API to paid tier
- Consider adding caching layer
- Monitor and optimize bundle size

## Troubleshooting

**Build fails:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**API calls fail:**
- Check API key is correct
- Verify key has proper permissions
- Check quota limits in AI Studio

**Fluid effects laggy:**
- Reduce particle count in App.jsx (line 19)
- Disable on mobile if needed
- Check GPU acceleration is enabled

**Environment variable not working:**
- Verify exact name: `VITE_GEMINI_API_KEY`
- Restart dev server after changing .env
- For platforms, trigger redeploy after adding vars

## Rollback

### Vercel/Netlify
Use platform UI to rollback to previous deployment

### Docker
```bash
docker stop buildbetter
docker run -d -p 80:80 buildbetter:previous-tag
```

## Security Notes

- Never expose API keys in client code
- CSP headers are set in nginx.conf
- API key should be in environment variables only
- Rate limiting is handled by Gemini API
- HTTPS is required for production (most platforms auto-enable)

## Performance Optimization

Already optimized:
- Code splitting (vendor chunks)
- Gzip compression
- Aggressive caching for static assets
- Lazy loading where possible
- Canvas effects optimized for 60fps

If you need more:
- Consider adding service worker
- Implement code splitting for routes
- Add image optimization
- Use CDN for static assets

## Cost Estimates

**Hosting (free tier):**
- Vercel/Netlify: $0/month (hobby projects)

**API (free tier):**
- Gemini: $0 for first 1,500 requests/day

**Paid tier needs:**
- High traffic sites: ~$20-50/month hosting
- Heavy API usage: ~$10-30/month API costs

Total for MVP: **$0/month**
Total for production scale: **$30-80/month**

## Support

Check logs:
- Browser: DevTools Console
- Server: `docker logs buildbetter`
- Vercel/Netlify: Platform dashboard

Still stuck? Verify:
1. API key is valid and active
2. Environment variables are set correctly
3. DNS is propagated (use https://dnschecker.org)
4. Build completed without errors
