# Wuwa

Separated frontend/backend development environment:

- Backend: Django in `Wuwa`
- Frontend: Vue + Vite in `WuwaFrontend`

## Backend

```powershell
cd Wuwa
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Backend health check:

```text
http://127.0.0.1:8000/api/health/
```

## Frontend

```powershell
cd WuwaFrontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Frontend development URL:

```text
http://127.0.0.1:5173/
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`, so frontend code can call `/api/...` during development.
