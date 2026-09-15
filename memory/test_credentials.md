# Test Credentials — Plotto Navigator

## Admin
- email: admin@plotto.app
- password: PlottoAdmin123
- role: admin

## Test User (create via signup, or use)
- email: writer@plotto.app
- password: writer123
- role: user

## Auth endpoints
- GET  /api/auth/captcha        -> { captcha_id, question } (answer is simple addition)
- POST /api/auth/register       -> { name, email, password, captcha_id, captcha_answer }
- POST /api/auth/login          -> { email, password, captcha_id, captcha_answer }
- GET  /api/auth/me             -> current user (cookie or Bearer)
- POST /api/auth/logout
- POST /api/auth/refresh

Notes:
- Captcha is a self-hosted math challenge. Fetch /api/auth/captcha first, parse the
  two numbers from `question` ("What is X + Y?"), submit their sum as captcha_answer.
- Auth uses httpOnly cookies (withCredentials) AND returns access_token in body for Bearer use.
