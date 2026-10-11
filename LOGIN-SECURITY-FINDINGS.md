# Login Security Findings

## Summary

The original login form had no explicit HTTP method. Before its client-side
submit handler ran, the browser used the default `GET` method and serialized
the email and password into the login URL. This was reproduced with JavaScript
disabled, six-times CPU throttling, and a throttled 3G connection.

The login form now uses a Server Action through React `useActionState` and
explicitly submits with `POST`. The action reads credentials only from
`FormData`, validates the redirect destination, sets the session cookie after
successful authentication, and redirects server-side. Hydration-warning
suppression was removed from the login controls. `POST` is uppercase in JSX
because React serializes the method that way in server-rendered HTML; HTTP
method values are case-insensitive.

## Finding

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | Pre-hydration login submission exposed credentials in the URL and a GET request. | Fixed in the login form and server action. |

No team acceptance is being claimed. No changes were merged.

## Validation

| Scenario | Result | Evidence / limitation |
|---|---|---|
| Baseline: submit before JavaScript loads with CPU and network throttling | **Reproduced** | With JavaScript disabled, 6x CPU throttling, and 3G conditions, the original form produced a `GET /login` request containing the synthetic test password in its query string. |
| Updated no-JavaScript form submission | **POST path verified** | Rendered form is `POST` with multipart server-action fields. A synthetic multipart submission reached the Server Action without credentials in its URL. |
| Normal successful login, throttled and unthrottled | **Not verified** | No known test account was available. Synthetic authentication attempts encountered HTTP 500 responses before a valid-login result could be exercised. |
| Repeated wrong-password attempts | **Partially verified** | Six synthetic multipart submissions resulted in the rate-limit response on attempt six. The first five returned HTTP 500, so their ordinary invalid-password response could not be verified in this environment. |
| Crafted GET login attempt | **Synthetic test passed** | A handcrafted GET using a synthetic-only password rendered the login page, set no session cookie, and did not redirect to an authenticated page. The synthetic value was necessarily present in that test request URL; never use real credentials for this test. |
| Tasks 1–5 test matrices | **Not available** | Their definitions were not present in the repository or supplied with this task. The scenarios above cover the explicit test bullets only. |

The local app build and TypeScript checks passed. ESLint passed for the two
changed login files. Repository-wide ESLint remains blocked by a pre-existing
error in `app/requests/new/NewRequestForm.tsx`.

## Scope and operational notes

- Application code does not log login credentials. This change cannot control
  logging performed by external proxies, hosting providers, or monitoring
  systems; those must not record request bodies or credential-bearing query
  strings.
- A malicious client can construct its own GET URL containing a password.
  The application cannot prevent that value from having been sent in the
  incoming URL; the security guarantee here is that the login form never sends
  credentials that way and that authentication is performed through the POST
  Server Action. External request logging must also be configured not to record
  such query strings.
- Do not merge until a second person runs the required flows and the missing
  Tasks 1–5 matrices are supplied and executed.
