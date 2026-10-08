from admin_helpers import _order_filter_clause, _search_pattern


def test_search_pattern_returns_none_for_blank_query() -> None:
    assert _search_pattern("") is None
    assert _search_pattern("   ") is None


def test_search_pattern_wraps_trimmed_query() -> None:
    assert _search_pattern("  kochi  ") == "%kochi%"


def test_order_filter_clause_active() -> None:
    clause = _order_filter_clause("active")
    assert "NOT IN ('delivered', 'cancelled')" in clause


def test_order_filter_clause_delivered() -> None:
    assert "o.status = 'delivered'" in _order_filter_clause("delivered")


def test_order_filter_clause_cancelled() -> None:
    assert "o.status = 'cancelled'" in _order_filter_clause("cancelled")


def test_order_filter_clause_all_is_empty() -> None:
    assert _order_filter_clause("all") == ""
