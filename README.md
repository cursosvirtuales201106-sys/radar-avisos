# ClienteYa - Registro, Login y Dashboard inicial

## Archivos incluidos

### Backend
- backend/app/main.py
- backend/app/schemas/usuario.py

### Frontend
- frontend/app/layout.tsx
- frontend/app/globals.css
- frontend/app/page.tsx
- frontend/app/registro/page.tsx
- frontend/app/login/page.tsx
- frontend/app/dashboard/page.tsx

## Variables necesarias en frontend/.env.local

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

## Variables recomendadas en backend/.env

FRONTEND_URL=http://localhost:3000
PUBLIC_BASE_URL=http://127.0.0.1:8000
SECRET_KEY=coloca_una_clave_larga_y_segura
ACCESS_TOKEN_EXPIRE_MINUTES=1440

## Flujo agregado

1. POST /auth/register-comercio
2. Crea comercio
3. Crea usuario administrador
4. Devuelve token JWT
5. Frontend guarda token en localStorage
6. Dashboard consume GET /dashboard/privado/mi-comercio

## Probar

Backend:
uvicorn app.main:app --reload

Frontend:
npm run dev

Entrar a:
http://localhost:3000/registro
