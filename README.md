# Spartans ASG — Panel administracyjny

Panel administracyjny dla sklepu Spartans ASG. Osobna aplikacja (React + TypeScript + Vite),
gadająca z tym samym projektem Supabase co sklep (`Spartans ASG.dc.html`).

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Wdrożenie (GitHub Pages)

```bash
npm run deploy
```

To builduje projekt i publikuje `dist/` na branch `gh-pages`, skąd GitHub Pages go serwuje pod
`https://dianajedrych.github.io/spartans-asg-admin/`.

## Pierwszy administrator

Konto admina nadaje się przez SQL Editor w Supabase (Table Editor lub SQL):

```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'twoj-email@przyklad.pl'
on conflict (user_id, role) do nothing;
```

Osoba musi mieć wcześniej zwykłe konto (zarejestrowane w sklepie albo w tym panelu logowania —
panel loguje istniejące konta, nie rejestruje nowych).
