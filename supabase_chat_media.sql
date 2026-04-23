-- Crear bucket para fotos/audios/archivos del chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth upload chat-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "public read chat-media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-media');
