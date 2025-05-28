# Article Tag Module Documentation

## 1. Database Structure (Supabase)

### Table: `articles_tag`
- `id` (uuid): Unique identifier
- `title` (string): Tag name (lowercase, unique per tenant)
- `slug` (string): Slug generated from title
- `tenant_id` (uuid): Tenant reference

### Table: `articles_tag_relations`
- `id` (uuid): Unique identifier
- `article_id` (uuid): Reference to article
- `tag_id` (uuid): Reference to tag
- `tenant_id` (uuid): Tenant reference

---

## 2. API Endpoints

### GET `/api/articles/tag`
- **Description:** Returns all tags for the authenticated tenant.
- **Query params:** None
- **Response:** `[{ id, title, slug, tenant_id }, ...]`

### POST `/api/articles/tag`
- **Description:** Creates a new tag for the tenant.
- **Body:**
  - `title` (string, required)
  - `slug` (string, required)
  - `tenant_id` (uuid, required)
- **Response:** Tag object

### GET `/api/articles/tag/relations`
- **Description:** Returns tag relations for an article, filtered by `article_id` and `tenant_id`.
- **Query params:**
  - `article_id` (uuid, required)
  - `tenant_id` (uuid, required)
- **Response:** `[{ id, article_id, tag_id, tenant_id }, ...]`

### POST `/api/articles/tag/relations`
- **Description:** Updates N:N relations between article and tags.
- **Body:**
  - `article_id` (uuid, required)
  - `tenant_id` (uuid, required)
  - `tag_ids` (array of uuid, required)
- **Response:** Success or error

---

## 3. Frontend (Nuxt 3)

- **Tag Input (shadcn TagsInput):**
  - Add tag by pressing Enter, Space, or on blur.
  - Only accepts lowercase values (auto-converts).
  - No duplicates or empty values allowed.
  - Suggestions (datalist) only show tags from the current tenant that are not already added.
  - When adding a new tag, it is created in `articles_tag` and related in `articles_tag_relations`.
  - Removing a tag removes the relation.
  - Input is cleared after adding.
  - Placeholder: `Add a tag and press Enter, Space or Blur...`

- **Tag Filtering:**
  - All tag queries and suggestions are filtered by `tenant_id`.
  - Only tags and relations from the current tenant are shown.

---

## 4. Security Policies (Supabase)
- All queries and mutations are restricted by `tenant_id`.
- Only authenticated users can create, update, or delete tags/relations for their tenant.
- Public access: Only SELECT on public data, filtered by tenant.

---

## 5. UX & Best Practices
- Minimalist, clean UI using shadcn for Nuxt 3.
- Fast, keyboard-friendly tag input.
- No tag from another tenant is ever shown or suggested.
- All logic and UI texts em inglês.

---

## 6. Observations
- Linter errors remanescentes são apenas de formatação e não afetam a lógica.
- O código segue padrão modular e reutilizável do Nuxt 3.

---

Se precisar de exemplos de payload, fluxogramas ou detalhes de integração, consulte o time de desenvolvimento ou a documentação dos endpoints específicos.
