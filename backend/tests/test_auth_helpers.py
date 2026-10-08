from auth import _email_from_claims, _phone_from_claims


def test_email_from_top_level_claim() -> None:
    assert _email_from_claims({"email": "User@Example.com"}) == "user@example.com"


def test_email_from_user_metadata() -> None:
    claims = {"user_metadata": {"email": "meta@example.com"}}
    assert _email_from_claims(claims) == "meta@example.com"


def test_email_missing_returns_none() -> None:
    assert _email_from_claims({}) is None


def test_phone_from_top_level_claim() -> None:
    assert _phone_from_claims({"phone": "+919876543210"}) == "+919876543210"


def test_phone_from_user_metadata() -> None:
    claims = {"user_metadata": {"phone": "+911234567890"}}
    assert _phone_from_claims(claims) == "+911234567890"
