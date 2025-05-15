-- Criar o bucket de produtos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de produtos
CREATE POLICY "Todos podem visualizar imagens de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Usuários autenticados podem atualizar suas imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Usuários autenticados podem remover suas imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products'); 