# File Structure Guide

## How to Arrange Files for Production

Download all files and arrange them exactly like this:

```
buildbetter/                    # your project root folder
│
├── src/                        # source code folder
│   └── App.jsx                 # main app component (has fluid effects, ai logic)
│
├── public/                     # static assets
│   ├── favicon.svg             # browser tab icon
│   └── logo.svg                # app logo (512x512)
│
├── index.html                  # html entry point
├── main.jsx                    # react entry point
├── package.json                # dependencies and scripts
├── vite.config.js              # build configuration
│
├── .env.example                # template for environment variables
├── .env                        # YOUR ACTUAL ENV FILE (create this, add api key)
├── .gitignore                  # git ignore rules
│
├── Dockerfile                  # docker image config
├── docker-compose.yml          # docker compose setup
├── nginx.conf                  # nginx server config
│
├── vercel.json                 # vercel deployment config
├── netlify.toml                # netlify deployment config
│
├── README.md                   # main documentation
└── DEPLOYMENT.md               # deployment instructions
```

## Step-by-Step Setup

### 1. Create Project Folder
```bash
mkdir buildbetter
cd buildbetter
```

### 2. Create Subfolders
```bash
mkdir src
mkdir public
```

### 3. Place Files

**Root directory files:**
- index.html
- main.jsx
- package.json
- vite.config.js
- .env.example
- .gitignore
- Dockerfile
- docker-compose.yml
- nginx.conf
- vercel.json
- netlify.toml
- README.md
- DEPLOYMENT.md

**src/ folder:**
- App.jsx

**public/ folder:**
- favicon.svg
- logo.svg

### 4. Create .env File

```bash
# copy template
cp .env.example .env

# edit and add your api key
# get key from: https://aistudio.google.com/app/apikey
```

Your `.env` should look like:
```
VITE_GEMINI_API_KEY=AIzaSy...your_actual_key
NODE_ENV=development
```

### 5. Install Dependencies

```bash
npm install
```

This will:
- Install React, Vite, Lucide icons
- Create node_modules/ folder
- Create package-lock.json

### 6. Test Locally

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Page loads with purple/blue gradient
- Fluid effects respond to mouse movement
- Can enter a pitch and get analysis
- Analysis is consistent (try same pitch twice)

### 7. Build for Production

```bash
npm run build
```

This creates `dist/` folder with optimized production files.

### 8. Deploy

Choose your platform and follow DEPLOYMENT.md instructions.

## Final Folder Structure (After Setup)

```
buildbetter/
├── src/
│   └── App.jsx
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── node_modules/              # created by npm install
├── dist/                      # created by npm run build
├── index.html
├── main.jsx
├── package.json
├── package-lock.json          # created by npm install
├── vite.config.js
├── .env                       # YOU CREATE THIS
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── vercel.json
├── netlify.toml
├── README.md
└── DEPLOYMENT.md
```

## Important Notes

### What to Commit to Git

✅ Commit:
- All source files
- Configuration files
- .env.example
- .gitignore

❌ NEVER Commit:
- .env (contains your API key!)
- node_modules/
- dist/
- package-lock.json (optional, but often excluded)

### What to Deploy

For platforms like Vercel/Netlify:
- They build from source
- Just push to git and they handle the rest
- Add env vars in their dashboard

For Docker/Self-hosted:
- You build the dist/ folder
- Deploy the built files
- Or use Docker to build and run

## Verification Checklist

After arranging files, verify:

- [ ] `src/App.jsx` exists and contains React component
- [ ] `public/favicon.svg` and `public/logo.svg` exist
- [ ] `package.json` has correct dependencies
- [ ] `.env` file exists with your API key
- [ ] `.gitignore` includes `.env` and `node_modules`
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts dev server
- [ ] App loads in browser at http://localhost:3000
- [ ] Fluid effects work when you move mouse
- [ ] Can submit a pitch and get analysis

## Common Mistakes

**❌ Wrong:**
```
buildbetter/
├── buildbetter/src/App.jsx    # nested folders
├── App.jsx                    # App.jsx in root instead of src/
├── .env.example               # using example instead of creating .env
└── no public/ folder          # missing public folder
```

**✅ Correct:**
```
buildbetter/
├── src/App.jsx               # App.jsx inside src/
├── public/favicon.svg        # static assets in public/
├── .env                      # actual .env file created
└── main.jsx                  # entry point in root
```

## Quick Commands Reference

```bash
# initial setup
mkdir buildbetter && cd buildbetter
mkdir src public
# download and place all files
cp .env.example .env
# edit .env with your api key
npm install

# development
npm run dev              # start dev server
npm run build            # build for production
npm run preview          # preview production build

# deployment
vercel --prod            # deploy to vercel
netlify deploy --prod    # deploy to netlify
docker-compose up -d     # run in docker

# maintenance
npm update               # update dependencies
npm audit                # check for vulnerabilities
npm run build            # rebuild after changes
```

## File Sizes (Approximate)

- App.jsx: ~30KB (main component with all logic)
- index.html: ~1KB
- main.jsx: ~0.2KB
- package.json: ~0.5KB
- vite.config.js: ~0.5KB
- favicon.svg: ~1KB
- logo.svg: ~2KB

Total source: ~35KB
Built bundle (dist): ~180KB gzipped

## Next Steps

1. Arrange all files as shown above
2. Create .env file with API key
3. Run `npm install`
4. Test with `npm run dev`
5. Build with `npm run build`
6. Deploy using DEPLOYMENT.md

You're ready for production! 🚀
