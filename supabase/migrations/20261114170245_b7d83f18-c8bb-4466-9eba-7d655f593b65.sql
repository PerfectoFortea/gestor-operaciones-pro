CREATE OR REPLACE FUNCTION public.owns_category(_category_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT _category_id IS NULL OR EXISTS (
    SELECT 1 FROM public.categories WHERE id = _category_id AND user_id = auth.uid()
  )
$$;