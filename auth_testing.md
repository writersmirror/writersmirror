# Plotto Navigator — Auth Testing

## Captcha flow (required for register & login)
1. GET /api/auth/captcha -> { captcha_id, question } e.g. "What is 4 + 7?"
2. Parse the two integers from `question`, compute their sum.
3. Submit sum as `captcha_answer` along with `captcha_id` in the register/login body.
Captcha is single-use and expires in 10 minutes. Fetch a fresh one per attempt.

## Endpoints
- POST /api/auth/register { name, email, password, captcha_id, captcha_answer }
- POST /api/auth/login    { email, password, captcha_id, captcha_answer }
- GET  /api/auth/me       (cookie or Authorization: Bearer <access_token>)
- POST /api/auth/logout
- POST /api/auth/refresh

Auth sets httpOnly cookies (withCredentials) AND returns access_token in the JSON body.
For curl/Bearer testing, use the returned access_token as `Authorization: Bearer`.

## Seeded admin
- email: admin@plotto.app
- password: PlottoAdmin123

## Example (curl)
```
CID=$(curl -s http://localhost:8001/api/auth/captcha)
# parse question -> compute sum, then:
curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plotto.app","password":"PlottoAdmin123","captcha_id":"<id>","captcha_answer":"<sum>"}'
```
