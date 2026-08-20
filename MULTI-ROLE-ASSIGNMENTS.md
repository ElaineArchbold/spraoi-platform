# Multi-role Team Staff Assignments

Adds a Team Staff Assignments panel to Club > Roles & Permissions.

- Choose user email
- Choose team
- Select multiple system/custom roles
- Saves each role as a separate public.user_roles row using the live schema:
  user_email + squad + squad_key + role
- Editing a person/team assignment adds missing roles and removes unticked roles for that same person/team only
- Parent/child relationships remain separate
- Admin and super_admin can manage assignments

No new SQL migration is required beyond the custom team roles table already added.
