# BAY-87 - Production Readiness

## 1. Build Verification

- [x] Prisma Client generated successfully.
- [x] Next.js production build completed successfully.
- [x] TypeScript checks passed.
- [x] Local production homepage returned HTTP 200.

## 2. Database Verification

- [x] Created a PostgreSQL backup.
- [x] Restored the backup into a separate test database.
- [x] Applied seven pending migrations to the test database.
- [x] Prisma reported that the test database schema is up to date.
- [x] Verified the EmailVerificationToken table exists.
- [x] Verified two properties remain in the test database.

The original local database was not the target of the migration rehearsal.

## 3. Environment Variables

Configure these variables in the production hosting platform:

- DATABASE_URL: Production PostgreSQL connection string.
- SESSION_SECRET: Strong random secret of at least 32 characters.
- APP_URL: Deployed application URL using HTTPS.
- SMTP_HOST: Email server hostname.
- SMTP_PORT: Email server port.
- SMTP_USER: Email account username.
- SMTP_PASSWORD: Email account password or app password.
- EMAIL_FROM: Authorized sender address.

Never commit real credentials or expose secrets through NEXT_PUBLIC_ variables.

## 4. Remaining Checks

- [ ] Verify production environment variables.
- [ ] Test email delivery with the configured provider.
- [ ] Confirm uploads use persistent production storage.
- [ ] Verify production database backups and restoration.
- [ ] Document the production rollback procedure.
- [ ] Test the deployed application before release.

## 5. Upload Storage Risk

The application currently stores uploads in a local private-uploads directory.

Before production deployment, verify that the hosting platform provides persistent storage. If it does not, create a follow-up task for persistent object storage while preserving the existing authorization checks.

## 6. Current Status

Local build and migration rehearsal: PASSED.

Production deployment readiness: NOT YET CONFIRMED.
