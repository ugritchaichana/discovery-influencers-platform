# DISCOVERY INFLUENCERS PLAYFORM

### STACK
- Frontend : `Next/React` `Tailwind` `Shadcn`
- Backend : `Next((API Routes)`
- Database : `PostgreSQL`
- Hosting : `Vercel(WebApp)` `Supabase(Database)`
- Auth : `Next Auth`
- Testing : `Jest` `Postman`

### SETUP
    1. Clone Git Repo
    Bash : `` https://github.com/ugritchaichana/discovery-influencers-platform.git ``
    
    2. Install Package
    Bash : ` pnpm install `

    3. Create .env 
```
    # super admin
    superadmin=superadmin@superadmin.com
    password=superadmin

    # auth
    AUTH_SECRET=cqCWEKBeUDiLaZ/yoDyo6iMc3dl12NRnchL2TR4kq/U=

    PRISMA_DISABLE_PREPARED_STATEMENTS=true

    # db postgres docker
    POSTGRES_HOST=db
    POSTGRES_PORT=5432
    POSTGRES_DB=postgres
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=postgres
    DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
    DIRECT_URL=postgresql://postgres:postgres@db:5432/postgres
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
    DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres

    # db postgres supabase
    # POSTGRES_HOST=aws-1-ap-south-1.pooler.supabase.com
    # POSTGRES_PORT=6543
    # POSTGRES_DB=postgres
    # POSTGRES_USER=postgres.pafidnvdoeqtewsqxqju
    # POSTGRES_PASSWORD=discoverty_INF@Ugrit
    # DATABASE_URL=postgresql://postgres.pafidnvdoeqtewsqxqju:discoverty_INF@Ugrit@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
    # DIRECT_URL=postgresql://postgres.pafidnvdoeqtewsqxqju:discoverty_INF@Ugrit@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

    4. Install Database
    Bash : `Docker-compose up --build db`

    4. Setup DB
    Bash : ` npx prisma generate ` and ` npm prisma db push `

    5. Run
    Node : ` pnpm dev ` or Docker : ` docker-compose up --build web `