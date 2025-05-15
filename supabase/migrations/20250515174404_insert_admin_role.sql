-- Inserir papel de administrador para todos os usuários existentes
DO $$ 
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        INSERT INTO user_roles (user_id, role)
        VALUES (user_record.id, 'admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    END LOOP;
END $$;
