/*
  # Configuração do Storage para Documentos

  1. Buckets
    - `client-documents` - Para documentos dos clientes (RG, comprovantes, etc.)

  2. Políticas de Storage
    - Usuários podem fazer upload de documentos para seus próprios clientes
    - Usuários podem visualizar documentos de seus próprios clientes
    - Administradores têm acesso total
*/

-- Criar bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false);

-- Política para permitir upload de documentos
CREATE POLICY "Users can upload documents for their clients"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents' AND
  (
    -- Usuário é dono do cliente (path: client_id/filename)
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id::text = (string_to_array(name, '/'))[1] 
      AND owner_id = auth.uid()
    )
    OR
    -- Usuário é administrador
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- Política para permitir visualização de documentos
CREATE POLICY "Users can view documents of their clients"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (
    -- Usuário é dono do cliente
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id::text = (string_to_array(name, '/'))[1] 
      AND owner_id = auth.uid()
    )
    OR
    -- Usuário é administrador
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- Política para permitir atualização de documentos
CREATE POLICY "Users can update documents of their clients"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id::text = (string_to_array(name, '/'))[1] 
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- Política para permitir exclusão de documentos
CREATE POLICY "Users can delete documents of their clients"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents' AND
  (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE id::text = (string_to_array(name, '/'))[1] 
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);