-- Enable realtime for incident_reports so admins get instant alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;