-- =============================================================================
-- Queue shift helper
-- =============================================================================
-- When a vehicle departs (leaves the queue), every vehicle behind it in the
-- same route's queue must advance by one position.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.shift_queue_forward(
  p_route_id text,
  p_from_position integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vehicles
  SET current_queue_position = current_queue_position - 1
  WHERE route_assignment_id = p_route_id
    AND current_queue_position > p_from_position
    AND current_queue_position > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shift_queue_forward(text, integer)
  TO authenticated, service_role;
