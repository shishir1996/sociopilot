ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generation_jobs;
ALTER TABLE public.video_generation_jobs REPLICA IDENTITY FULL;